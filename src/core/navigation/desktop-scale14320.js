/* Keep the approved desktop at native 100% sizing. Responsive styles own fitting.
   Coordinate helpers remain compatible with menus introduced in v143.20. */
(()=>{'use strict';
window.desktopScale14320={
 get scale(){return 1},
 rect(element){return element.getBoundingClientRect()},
 get width(){return innerWidth},
 get height(){return innerHeight}
};
})();
