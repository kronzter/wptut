import { useEffect, useMemo, useRef } from "react";
import { Viewer, useCesium } from "resium";
import {
  Cartesian3,
  Color,
  PointPrimitiveCollection,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  NearFarScalar,
  HorizontalOrigin,
  VerticalOrigin,
  LabelStyle,
  Cartesian2,
  EllipsoidTerrainProvider,
  SingleTileImageryProvider,
  UrlTemplateImageryProvider,
  Rectangle,
} from "cesium";
import {
  geodeticAt,
  orbitPathDegrees,
  satrecFromRecord,
} from "../lib/propagate.js";

const LAYER_COLORS = {
  stations: Color.fromCssColorString("#5eead4"),
  amateur: Color.fromCssColorString("#86efac"),
  starlink: Color.fromCssColorString("#e879f9"),
  active: Color.fromCssColorString("#7dd3fc"),
  debris: Color.fromCssColorString("#f5c16c"),
};

const TERRAIN_PROVIDER = new EllipsoidTerrainProvider();
const VIEWER_CONTEXT = {
  requestWebgl1: true,
  webgl: {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  },
};

function earthTextureUrl() {
  return `${window.location.origin}/earth.png`;
}

function worldImageryProvider() {
  return new UrlTemplateImageryProvider({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    credit: "Esri, Maxar, Earthstar Geographics",
    maximumLevel: 16,
  });
}

function GlobeSetup() {
  const { viewer } = useCesium();
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;

    const scene = viewer.scene;
    scene.globe.baseColor = Color.fromCssColorString("#1d4e89");
    scene.globe.enableLighting = false;
    scene.globe.dynamicAtmosphereLighting = false;
    scene.globe.showGroundAtmosphere = true;
    scene.globe.showWaterEffect = false;
    scene.globe.translucency.enabled = false;
    scene.backgroundColor = Color.fromCssColorString("#07090f");
    scene.fog.enabled = false;
    if (scene.sun) scene.sun.show = true;
    if (scene.moon) scene.moon.show = false;
    if (scene.skyBox) scene.skyBox.show = false;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
    viewer.useDefaultRenderLoop = true;
    scene.globe.show = true;
    scene.globe.maximumScreenSpaceError = 1.5;
    scene.globe.tileCacheSize = 200;

    const keepRendering = () => {
      if (viewer.isDestroyed()) return;
      viewer.useDefaultRenderLoop = true;
    };
    scene.renderError.addEventListener(keepRendering);

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(72.87, 19.07, 2.4e7),
    });

    const addEarth = async () => {
      if (viewer.isDestroyed()) return;
      viewer.imageryLayers.removeAll();

      try {
        const local = await SingleTileImageryProvider.fromUrl(earthTextureUrl(), {
          rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
          credit: "OrbitWatch local Earth",
        });
        if (viewer.isDestroyed()) return;
        viewer.imageryLayers.addImageryProvider(local);
      } catch (err) {
        console.warn("Local Earth layer failed; using solid globe color.", err);
      }

      try {
        const tiles = worldImageryProvider();
        tiles.errorEvent.addEventListener((error) => {
          console.warn("World imagery tile error; keeping fallback globe.", error);
        });
        if (viewer.isDestroyed()) return;
        viewer.imageryLayers.addImageryProvider(tiles);
      } catch (err) {
        console.warn("World imagery failed; keeping local globe.", err);
      }
    };
    addEarth();

    const onResize = () => {
      if (!viewer.isDestroyed()) viewer.resize();
    };
    onResize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    if (viewer.container) ro.observe(viewer.container);
    return () => {
      scene.renderError.removeEventListener(keepRendering);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [viewer]);
  return null;
}

function TrackingLayer({
  objects,
  simTime,
  selectedId,
  onSelect,
  flyToken,
}) {
  const { viewer } = useCesium();
  const collectionRef = useRef(null);
  const primitiveMap = useRef(new Map());
  const satrecMap = useRef(new Map());
  const lastUpdate = useRef(0);
  const simRef = useRef(simTime);
  simRef.current = simTime;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const objectList = useMemo(() => objects, [objects]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const collection = viewer.scene.primitives.add(new PointPrimitiveCollection());
    collectionRef.current = collection;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      const payload = picked?.id;
      if (payload?.noradId) onSelectRef.current(payload.noradId);
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(collection);
      }
      collectionRef.current = null;
      primitiveMap.current.clear();
    };
  }, [viewer]);

  useEffect(() => {
    const collection = collectionRef.current;
    if (!collection) return;
    collection.removeAll();
    primitiveMap.current.clear();
    satrecMap.current.clear();

    for (const obj of objectList) {
      const satrec = satrecFromRecord(obj.record);
      if (!satrec) continue;
      satrecMap.current.set(obj.record.noradId, satrec);
      const color = LAYER_COLORS[obj.layer] || Color.WHITE;
      const primitive = collection.add({
        position: Cartesian3.fromDegrees(0, 0, 400000),
        pixelSize: obj.layer === "debris" ? 2.2 : obj.layer === "starlink" ? 2.6 : 5,
        color,
        outlineColor: Color.BLACK,
        outlineWidth: 0,
        scaleByDistance: new NearFarScalar(2e6, 1.4, 2.2e7, 0.35),
        id: { noradId: obj.record.noradId, layer: obj.layer },
      });
      primitiveMap.current.set(obj.record.noradId, primitive);
    }
  }, [objectList]);

  useEffect(() => {
    let raf = 0;
    const heavy = objectList.length > 600;
    const interval = heavy ? 500 : 100;

    const tick = (t) => {
      if (t - lastUpdate.current >= interval) {
        lastUpdate.current = t;
        const date = simRef.current;
        primitiveMap.current.forEach((primitive, noradId) => {
          const satrec = satrecMap.current.get(noradId);
          const geo = geodeticAt(satrec, date);
          if (!geo) return;
          primitive.position = Cartesian3.fromDegrees(geo.longitude, geo.latitude, geo.heightM);
          const layer = primitive.id?.layer;
          const base = layer === "debris" ? 2.2 : layer === "starlink" ? 2.6 : 5;
          const selected = noradId === selectedId;
          primitive.pixelSize = selected ? 11 : base;
          primitive.outlineWidth = selected ? 1 : 0;
          primitive.outlineColor = selected ? Color.WHITE : Color.BLACK;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [objectList, selectedId]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !selectedId) return;
    const rec = objectList.find((o) => o.record.noradId === selectedId)?.record;
    if (!rec) {
      viewer.entities.removeById("orbit-path");
      viewer.entities.removeById("selected-label");
      return;
    }
    const date = simRef.current;
    const satrec = satrecFromRecord(rec);
    const geo = geodeticAt(satrec, date);
    const path = orbitPathDegrees(rec, date);
    viewer.entities.removeById("orbit-path");
    viewer.entities.removeById("selected-label");
    if (path.length >= 6) {
      viewer.entities.add({
        id: "orbit-path",
        polyline: {
          positions: Cartesian3.fromDegreesArrayHeights(path),
          width: 2.2,
          material: Color.fromCssColorString("#9af7e8").withAlpha(0.75),
        },
      });
    }
    if (geo) {
      viewer.entities.add({
        id: "selected-label",
        position: Cartesian3.fromDegrees(geo.longitude, geo.latitude, geo.heightM),
        label: {
          text: rec.name,
          font: "600 13px IBM Plex Sans, sans-serif",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -18),
          horizontalOrigin: HorizontalOrigin.CENTER,
          verticalOrigin: VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
  }, [viewer, selectedId, objectList, simTime]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !selectedId || !flyToken) return;
    const rec = objectList.find((o) => o.record.noradId === selectedId)?.record;
    const geo = rec ? geodeticAt(satrecFromRecord(rec), simRef.current) : null;
    if (!geo) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(geo.longitude, geo.latitude, Math.max(geo.heightM + 9e5, 1.2e6)),
      duration: 1.4,
    });
  }, [viewer, selectedId, flyToken, objectList]);

  return null;
}

export default function Globe({ objects, simTime, selectedId, onSelect, flyToken }) {
  return (
    <Viewer
      full
      timeline={false}
      animation={false}
      geocoder={false}
      sceneModePicker={false}
      baseLayerPicker={false}
      navigationHelpButton={false}
      infoBox={false}
      selectionIndicator={false}
      fullscreenButton={false}
      skyBox={false}
      showRenderLoopErrors={false}
      baseLayer={false}
      terrainProvider={TERRAIN_PROVIDER}
      contextOptions={VIEWER_CONTEXT}
    >
      <GlobeSetup />
      <TrackingLayer
        objects={objects}
        simTime={simTime}
        selectedId={selectedId}
        onSelect={onSelect}
        flyToken={flyToken}
      />
    </Viewer>
  );
}
