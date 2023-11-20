import MapboxDraw from '@mapbox/mapbox-gl-draw';

import {createSnapList, getGuideFeature, IDS, snap} from '../utils';

const SimpleSelect = MapboxDraw.modes.simple_select;
const SnapSimpleSelectMode = {...SimpleSelect};

SnapSimpleSelectMode.onSetup = function (opts) {
  const verticalGuide = this.newFeature(getGuideFeature(IDS.VERTICAL_GUIDE));
  const horizontalGuide = this.newFeature(getGuideFeature(IDS.HORIZONTAL_GUIDE));

  this.addFeature(verticalGuide);
  this.addFeature(horizontalGuide);


  const featureIds = opts.featureIds;
  const feature = featureIds && featureIds.length > 0 ? this.getFeature(featureIds[0]) : {};

  const [snapList, vertices] = feature ? createSnapList(this.map, this._ctx.api, feature) : [[], []];

  const snapState = {
    map: this.map,
    vertices,
    feature: [],
    snapList,
    verticalGuide,
    horizontalGuide,
    options: this._ctx.options,
    initialized: false
  };

  registerCallbacks.call(this, this.map, snapState);

  return snapState;
};

SnapSimpleSelectMode.onMouseUp = function (state, e) {
  const featuresSelected = this.getSelected();

  if (!this.map.isMoving() && !this.map.isZooming() && featuresSelected && featuresSelected.length > 0 && isPointFeature(featuresSelected[0])) {
    const snapped = snap(state, e);
    (featuresSelected[0]).updateCoordinate(snapped.lng, snapped.lat);
  }
  SimpleSelect.onMouseUp?.call(this, state, e);
};

function isPointFeature(feature) {
  return feature.type === 'Point';
}

function registerCallbacks(map, state) {
  const moveEndCallback = () => {
    try {
      const [snapList, vertices] = createSnapList(this.map, this._ctx.api, {});
      state.vertices = vertices;
      state.snapList = snapList;
    } catch (error) {
      console.warn('Failed to determine snaplist. This could happen when listener is not cleared', error);
    }
  };
  state.moveEndCallback = moveEndCallback;

  map.on('moveend', moveEndCallback);

  const optionsChangedCallBack = (options) => {
    state.options = options;
  };
  // for removing listener later on close
  state["optionsChangedCallBack"] = optionsChangedCallBack;
  this.map.on("draw.snap.options_changed", optionsChangedCallBack);
}

SnapSimpleSelectMode.onStop = function (state) {
  this.deleteFeature(IDS.VERTICAL_GUIDE, {silent: true});
  this.deleteFeature(IDS.HORIZONTAL_GUIDE, {silent: true});

  // remove moveemd callback
  this.map.off("moveend", state.moveendCallback);
  this.map.off("draw.snap.options_changed", state.optionsChangedCallBack);

  // This relies on the the state of SnapPointMode having a 'point' prop
  SimpleSelect.onStop?.call(this, state);
};

export default SnapSimpleSelectMode;
