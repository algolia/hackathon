(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
  Copyright (c) 2015 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/

(function () {
	'use strict';

	function classNames () {

		var classes = '';

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if ('string' === argType || 'number' === argType) {
				classes += ' ' + arg;

			} else if (Array.isArray(arg)) {
				classes += ' ' + classNames.apply(null, arg);

			} else if ('object' === argType) {
				for (var key in arg) {
					if (arg.hasOwnProperty(key) && arg[key]) {
						classes += ' ' + key;
					}
				}
			}
		}

		return classes.substr(1);
	}

	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// AMD. Register as an anonymous module.
		define(function () {
			return classNames;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else {
		window.classNames = classNames;
	}

}());

},{}],2:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');

// Enable React Touch Events
React.initializeTouchEvents(true);

function getTouchProps(touch) {
	if (!touch) return {};
	return {
		pageX: touch.pageX,
		pageY: touch.pageY,
		clientX: touch.clientX,
		clientY: touch.clientY
	};
}

function isDataOrAriaProp(key) {
	return key.indexOf('data-') === 0 || key.indexOf('aria-') === 0;
}

function getPinchProps(touches) {
	return {
		touches: Array.prototype.map.call(touches, function copyTouch(touch) {
			return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
		}),
		center: { x: (touches[0].pageX + touches[1].pageX) / 2, y: (touches[0].pageY + touches[1].pageY) / 2 },
		angle: Math.atan() * (touches[1].pageY - touches[0].pageY) / (touches[1].pageX - touches[0].pageX) * 180 / Math.PI,
		distance: Math.sqrt(Math.pow(Math.abs(touches[1].pageX - touches[0].pageX), 2) + Math.pow(Math.abs(touches[1].pageY - touches[0].pageY), 2))
	};
}

/**
 * Tappable Mixin
 * ==============
 */

var Mixin = {
	propTypes: {
		moveThreshold: React.PropTypes.number, // pixels to move before cancelling tap
		activeDelay: React.PropTypes.number, // ms to wait before adding the `-active` class
		pressDelay: React.PropTypes.number, // ms to wait before detecting a press
		pressMoveThreshold: React.PropTypes.number, // pixels to move before cancelling press
		preventDefault: React.PropTypes.bool, // whether to preventDefault on all events
		stopPropagation: React.PropTypes.bool, // whether to stopPropagation on all events

		onTap: React.PropTypes.func, // fires when a tap is detected
		onPress: React.PropTypes.func, // fires when a press is detected
		onTouchStart: React.PropTypes.func, // pass-through touch event
		onTouchMove: React.PropTypes.func, // pass-through touch event
		onTouchEnd: React.PropTypes.func, // pass-through touch event
		onMouseDown: React.PropTypes.func, // pass-through mouse event
		onMouseUp: React.PropTypes.func, // pass-through mouse event
		onMouseMove: React.PropTypes.func, // pass-through mouse event
		onMouseOut: React.PropTypes.func, // pass-through mouse event

		onPinchStart: React.PropTypes.func, // fires when a pinch gesture is started
		onPinchMove: React.PropTypes.func, // fires on every touch-move when a pinch action is active
		onPinchEnd: React.PropTypes.func // fires when a pinch action ends
	},

	getDefaultProps: function getDefaultProps() {
		return {
			activeDelay: 0,
			moveThreshold: 100,
			pressDelay: 1000,
			pressMoveThreshold: 5
		};
	},

	getInitialState: function getInitialState() {
		return {
			isActive: false,
			touchActive: false,
			pinchActive: false
		};
	},

	componentWillUnmount: function componentWillUnmount() {
		this.cleanupScrollDetection();
		this.cancelPressDetection();
		this.clearActiveTimeout();
	},

	processEvent: function processEvent(event) {
		if (this.props.preventDefault) event.preventDefault();
		if (this.props.stopPropagation) event.stopPropagation();
	},

	onTouchStart: function onTouchStart(event) {
		if (this.props.onTouchStart && this.props.onTouchStart(event) === false) return;
		this.processEvent(event);
		window._blockMouseEvents = true;
		if (event.touches.length === 1) {
			this._initialTouch = this._lastTouch = getTouchProps(event.touches[0]);
			this.initScrollDetection();
			this.initPressDetection(event, this.endTouch);
			this._activeTimeout = setTimeout(this.makeActive, this.props.activeDelay);
		} else if ((this.props.onPinchStart || this.props.onPinchMove || this.props.onPinchEnd) && event.touches.length === 2) {
			this.onPinchStart(event);
		}
	},

	makeActive: function makeActive() {
		if (!this.isMounted()) return;
		this.clearActiveTimeout();
		this.setState({
			isActive: true
		});
	},

	clearActiveTimeout: function clearActiveTimeout() {
		clearTimeout(this._activeTimeout);
		this._activeTimeout = false;
	},

	onPinchStart: function onPinchStart(event) {
		// in case the two touches didn't start exactly at the same time
		if (this._initialTouch) {
			this.endTouch();
		}
		var touches = event.touches;
		this._initialPinch = getPinchProps(touches);
		this._initialPinch = _extends(this._initialPinch, {
			displacement: { x: 0, y: 0 },
			displacementVelocity: { x: 0, y: 0 },
			rotation: 0,
			rotationVelocity: 0,
			zoom: 1,
			zoomVelocity: 0,
			time: Date.now()
		});
		this._lastPinch = this._initialPinch;
		this.props.onPinchStart && this.props.onPinchStart(this._initialPinch, event);
	},

	onPinchMove: function onPinchMove(event) {
		if (this._initialTouch) {
			this.endTouch();
		}
		var touches = event.touches;
		if (touches.length !== 2) {
			return this.onPinchEnd(event) // bail out before disaster
			;
		}

		var currentPinch = touches[0].identifier === this._initialPinch.touches[0].identifier && touches[1].identifier === this._initialPinch.touches[1].identifier ? getPinchProps(touches) // the touches are in the correct order
		: touches[1].identifier === this._initialPinch.touches[0].identifier && touches[0].identifier === this._initialPinch.touches[1].identifier ? getPinchProps(touches.reverse()) // the touches have somehow changed order
		: getPinchProps(touches); // something is wrong, but we still have two touch-points, so we try not to fail

		currentPinch.displacement = {
			x: currentPinch.center.x - this._initialPinch.center.x,
			y: currentPinch.center.y - this._initialPinch.center.y
		};

		currentPinch.time = Date.now();
		var timeSinceLastPinch = currentPinch.time - this._lastPinch.time;

		currentPinch.displacementVelocity = {
			x: (currentPinch.displacement.x - this._lastPinch.displacement.x) / timeSinceLastPinch,
			y: (currentPinch.displacement.y - this._lastPinch.displacement.y) / timeSinceLastPinch
		};

		currentPinch.rotation = currentPinch.angle - this._initialPinch.angle;
		currentPinch.rotationVelocity = currentPinch.rotation - this._lastPinch.rotation / timeSinceLastPinch;

		currentPinch.zoom = currentPinch.distance / this._initialPinch.distance;
		currentPinch.zoomVelocity = (currentPinch.zoom - this._lastPinch.zoom) / timeSinceLastPinch;

		this.props.onPinchMove && this.props.onPinchMove(currentPinch, event);

		this._lastPinch = currentPinch;
	},

	onPinchEnd: function onPinchEnd(event) {
		// TODO use helper to order touches by identifier and use actual values on touchEnd.
		var currentPinch = _extends({}, this._lastPinch);
		currentPinch.time = Date.now();

		if (currentPinch.time - this._lastPinch.time > 16) {
			currentPinch.displacementVelocity = 0;
			currentPinch.rotationVelocity = 0;
			currentPinch.zoomVelocity = 0;
		}

		this.props.onPinchEnd && this.props.onPinchEnd(currentPinch, event);

		this._initialPinch = this._lastPinch = null;

		// If one finger is still on screen, it should start a new touch event for swiping etc
		// But it should never fire an onTap or onPress event.
		// Since there is no support swipes yet, this should be disregarded for now
		// if (event.touches.length === 1) {
		// 	this.onTouchStart(event);
		// }
	},

	initScrollDetection: function initScrollDetection() {
		this._scrollPos = { top: 0, left: 0 };
		this._scrollParents = [];
		this._scrollParentPos = [];
		var node = this.getDOMNode();
		while (node) {
			if (node.scrollHeight > node.offsetHeight || node.scrollWidth > node.offsetWidth) {
				this._scrollParents.push(node);
				this._scrollParentPos.push(node.scrollTop + node.scrollLeft);
				this._scrollPos.top += node.scrollTop;
				this._scrollPos.left += node.scrollLeft;
			}
			node = node.parentNode;
		}
	},

	calculateMovement: function calculateMovement(touch) {
		return {
			x: Math.abs(touch.clientX - this._initialTouch.clientX),
			y: Math.abs(touch.clientY - this._initialTouch.clientY)
		};
	},

	detectScroll: function detectScroll() {
		var currentScrollPos = { top: 0, left: 0 };
		for (var i = 0; i < this._scrollParents.length; i++) {
			currentScrollPos.top += this._scrollParents[i].scrollTop;
			currentScrollPos.left += this._scrollParents[i].scrollLeft;
		}
		return !(currentScrollPos.top === this._scrollPos.top && currentScrollPos.left === this._scrollPos.left);
	},

	cleanupScrollDetection: function cleanupScrollDetection() {
		this._scrollParents = undefined;
		this._scrollPos = undefined;
	},

	initPressDetection: function initPressDetection(event, callback) {
		if (!this.props.onPress) return;
		this._pressTimeout = setTimeout((function () {
			this.props.onPress(event);
			callback();
		}).bind(this), this.props.pressDelay);
	},

	cancelPressDetection: function cancelPressDetection() {
		clearTimeout(this._pressTimeout);
	},

	onTouchMove: function onTouchMove(event) {
		if (this._initialTouch) {
			this.processEvent(event);

			if (this.detectScroll()) return this.endTouch(event);

			this.props.onTouchMove && this.props.onTouchMove(event);
			this._lastTouch = getTouchProps(event.touches[0]);
			var movement = this.calculateMovement(this._lastTouch);
			if (movement.x > this.props.pressMoveThreshold || movement.y > this.props.pressMoveThreshold) {
				this.cancelPressDetection();
			}
			if (movement.x > this.props.moveThreshold || movement.y > this.props.moveThreshold) {
				if (this.state.isActive) {
					this.setState({
						isActive: false
					});
				} else if (this._activeTimeout) {
					this.clearActiveTimeout();
				}
			} else {
				if (!this.state.isActive && !this._activeTimeout) {
					this.setState({
						isActive: true
					});
				}
			}
		} else if (this._initialPinch && event.touches.length === 2) {
			this.onPinchMove(event);
			event.preventDefault();
		}
	},

	onTouchEnd: function onTouchEnd(event) {
		var _this = this;

		if (this._initialTouch) {
			this.processEvent(event);
			var afterEndTouch;
			var movement = this.calculateMovement(this._lastTouch);
			if (movement.x <= this.props.moveThreshold && movement.y <= this.props.moveThreshold && this.props.onTap) {
				event.preventDefault();
				afterEndTouch = function () {
					var finalParentScrollPos = _this._scrollParents.map(function (node) {
						return node.scrollTop + node.scrollLeft;
					});
					var stoppedMomentumScroll = _this._scrollParentPos.some(function (end, i) {
						return end !== finalParentScrollPos[i];
					});
					if (!stoppedMomentumScroll) {
						_this.props.onTap(event);
					}
				};
			}
			this.endTouch(event, afterEndTouch);
		} else if (this._initialPinch && event.touches.length + event.changedTouches.length === 2) {
			this.onPinchEnd(event);
			event.preventDefault();
		}
	},

	endTouch: function endTouch(event, callback) {
		this.cancelPressDetection();
		this.clearActiveTimeout();
		if (event && this.props.onTouchEnd) {
			this.props.onTouchEnd(event);
		}
		this._initialTouch = null;
		this._lastTouch = null;
		if (this.state.isActive) {
			this.setState({
				isActive: false
			}, callback);
		} else if (callback) {
			callback();
		}
	},

	onMouseDown: function onMouseDown(event) {
		if (window._blockMouseEvents) {
			window._blockMouseEvents = false;
			return;
		}
		if (this.props.onMouseDown && this.props.onMouseDown(event) === false) return;
		this.processEvent(event);
		this.initPressDetection(event, this.endMouseEvent);
		this._mouseDown = true;
		this.setState({
			isActive: true
		});
	},

	onMouseMove: function onMouseMove(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseMove && this.props.onMouseMove(event);
	},

	onMouseUp: function onMouseUp(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseUp && this.props.onMouseUp(event);
		this.props.onTap && this.props.onTap(event);
		this.endMouseEvent();
	},

	onMouseOut: function onMouseOut(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseOut && this.props.onMouseOut(event);
		this.endMouseEvent();
	},

	endMouseEvent: function endMouseEvent() {
		this.cancelPressDetection();
		this._mouseDown = false;
		this.setState({
			isActive: false
		});
	},

	touchStyles: function touchStyles() {
		return {
			WebkitTapHighlightColor: 'rgba(0,0,0,0)',
			WebkitTouchCallout: 'none',
			WebkitUserSelect: 'none',
			KhtmlUserSelect: 'none',
			MozUserSelect: 'none',
			msUserSelect: 'none',
			userSelect: 'none',
			cursor: 'pointer'
		};
	},

	handlers: function handlers() {
		return {
			onTouchStart: this.onTouchStart,
			onTouchMove: this.onTouchMove,
			onTouchEnd: this.onTouchEnd,
			onMouseDown: this.onMouseDown,
			onMouseUp: this.onMouseUp,
			onMouseMove: this.onMouseMove,
			onMouseOut: this.onMouseOut
		};
	}
};

/**
 * Tappable Component
 * ==================
 */

var Component = React.createClass({

	displayName: 'Tappable',

	mixins: [Mixin],

	propTypes: {
		component: React.PropTypes.any, // component to create
		className: React.PropTypes.string, // optional className
		classBase: React.PropTypes.string, // base for generated classNames
		style: React.PropTypes.object, // additional style properties for the component
		disabled: React.PropTypes.bool // only applies to buttons
	},

	getDefaultProps: function getDefaultProps() {
		return {
			component: 'span',
			classBase: 'Tappable'
		};
	},

	render: function render() {
		var props = this.props;
		var className = props.classBase + (this.state.isActive ? '-active' : '-inactive');

		if (props.className) {
			className += ' ' + props.className;
		}

		var style = {};
		_extends(style, this.touchStyles(), props.style);

		var newComponentProps = _extends({}, props, {
			style: style,
			className: className,
			disabled: props.disabled,
			handlers: this.handlers
		}, this.handlers());

		delete newComponentProps.onTap;
		delete newComponentProps.onPress;
		delete newComponentProps.onPinchStart;
		delete newComponentProps.onPinchMove;
		delete newComponentProps.onPinchEnd;
		delete newComponentProps.moveThreshold;
		delete newComponentProps.pressDelay;
		delete newComponentProps.pressMoveThreshold;
		delete newComponentProps.preventDefault;
		delete newComponentProps.stopPropagation;
		delete newComponentProps.component;

		return React.createElement(props.component, newComponentProps, props.children);
	}
});

Component.Mixin = Mixin;
module.exports = Component;
},{"react":undefined}],3:[function(require,module,exports){
module.exports = function Timers () {
  var intervals = []
  var timeouts = []

  return {
    clearIntervals: function () {
      intervals.forEach(clearInterval)
    },

    clearTimeouts: function () {
      timeouts.forEach(clearTimeout)
    },

    componentWillMount: function () {
      intervals = []
      timeouts = []
    },

    componentWillUnmount: function () {
      this.clearIntervals()
      this.clearTimeouts()
    },

    countDown: function (callback, timeout, interval) {
      var self = this
      var sleep = Math.min(timeout, interval)

      this.setTimeout(function () {
        var remaining = timeout - sleep

        callback(remaining)
        if (remaining <= 0) return

        self.countDown(callback, remaining, interval)
      }, sleep)
    },

    setInterval: function (callback, interval) {
      var self = this

      intervals.push(setInterval(function () {
        if (!self.isMounted()) return

        callback.call(self)
      }, interval))
    },

    setTimeout: function (callback, timeout) {
      var self = this

      timeouts.push(setTimeout(function () {
        if (!self.isMounted()) return

        callback.call(self)
      }, timeout))
    }
  }
}

},{}],4:[function(require,module,exports){
var Touchstone = {
	createApp: require('./lib/createApp'),
	Navigation: require('./lib/mixins/Navigation'),
	Link: require('./lib/components/Link'),
	UI: require('./lib/ui')
};

module.exports = Touchstone;

},{"./lib/components/Link":5,"./lib/createApp":7,"./lib/mixins/Navigation":9,"./lib/ui":35}],5:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var Tappable = require('react-tappable');
var Navigation = require('../mixins/Navigation');

var TRANSITION_KEYS = require('../constants/transition-keys');
var validTransitions = Object.keys(TRANSITION_KEYS);

/**
 * Touchstone Link Component
 * =========================
 */

module.exports = React.createClass({

	displayName: 'Link',

	mixins: [Navigation],

	propTypes: {
		to: React.PropTypes.string.isRequired,
		params: React.PropTypes.object,
		viewTransition: React.PropTypes.oneOf(validTransitions),
		component: React.PropTypes.any,
		className: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			viewTransition: 'none',
			component: 'span'
		};
	},

	action: function action() {
		var params = this.props.params;

		if ('function' === typeof params) {
			params = params.call(this);
		}

		this.showView(this.props.to, this.props.viewTransition, params);
	},

	render: function render() {
		return React.createElement(
			Tappable,
			{ onTap: this.action, className: this.props.className, component: this.props.component },
			this.props.children
		);
	}

});
},{"../constants/transition-keys":6,"../mixins/Navigation":9,"react-tappable":2,"react/addons":undefined}],6:[function(require,module,exports){
/**
 * View transition animations
 * ==========================
 */

module.exports = {
	'none': { in: false, out: false },
	'fade': { in: true, out: true },
	'fade-contract': { in: true, out: true },
	'fade-expand': { in: true, out: true },
	'show-from-left': { in: true, out: true },
	'show-from-right': { in: true, out: true },
	'show-from-top': { in: true, out: true },
	'show-from-bottom': { in: true, out: true },
	'reveal-from-left': { in: true, out: true },
	'reveal-from-right': { in: true, out: true },
	'reveal-from-top': { in: false, out: true },
	'reveal-from-bottom': { in: false, out: true }
};
},{}],7:[function(require,module,exports){
'use strict';

var xtend = require('xtend/mutable');
var React = require('react/addons');
var UI = require('./ui');

var DEFAULT_TRANSITION = 'none';
var TRANSITIONS = require('./constants/transition-keys');

/**
 * Touchstone App
 * ==============
 *
 * This function should be called with your app's views.
 *
 * It returns a Mixin which should be added to your App.
 */
function createApp(views) {
	return {
		componentWillMount: function componentWillMount() {
			this.views = {};

			for (var viewName in views) {
				var view = views[viewName];
				this.views[viewName] = React.createFactory(view);
			}
		},

		childContextTypes: {
			currentView: React.PropTypes.string,
			app: React.PropTypes.object.isRequired
		},

		getChildContext: function getChildContext() {
			return {
				currentView: this.state.currentView,
				app: this
			};
		},

		getCurrentView: function getCurrentView() {
			var viewsData = {};
			viewsData[this.state.currentView] = this.getView(this.state.currentView);
			var views = React.addons.createFragment(viewsData);
			return views;
		},

		getInitialState: function getInitialState() {
			return {
				viewTransition: this.getViewTransition(DEFAULT_TRANSITION)
			};
		},

		getView: function getView(key) {
			var view = views[key];
			if (!view) return this.getViewNotFound();

			var givenProps = this.state[key + '_props'];
			var props = xtend({
				key: key,
				app: this,
				viewClassName: this.state[key + '_class'] || 'view'
			}, givenProps);

			if (this.getViewProps) {
				xtend(props, this.getViewProps());
			}

			return React.createElement(view, props);
		},

		getViewNotFound: function getViewNotFound() {
			return React.createElement(
				UI.View,
				{ className: 'view' },
				React.createElement(
					UI.ViewContent,
					null,
					React.createElement(UI.Feedback, {
						iconKey: 'ion-alert-circled',
						iconType: 'danger',
						text: 'Sorry, the view <strong>"' + this.state.currentView + '"</strong> is not available.',
						actionText: 'Okay, take me home',
						actionFn: this.gotoDefaultView
					})
				)
			);
		},

		getViewTransition: function getViewTransition(key) {
			if (!TRANSITIONS[key]) {
				console.log('Invalid View Transition: ' + key);
				key = 'none';
			}

			return xtend({
				key: key,
				name: 'view-transition-' + key,
				'in': false,
				out: false
			}, TRANSITIONS[key]);
		},

		showView: function showView(key, transition, props, state) {
			if (typeof transition === 'object') {
				props = transition;
				transition = DEFAULT_TRANSITION;
			}

			if (typeof transition !== 'string') {
				transition = DEFAULT_TRANSITION;
			}

			console.log('Showing view |' + key + '| with transition |' + transition + '| and props ' + JSON.stringify(props));

			var newState = {
				currentView: key,
				previousView: this.state.currentView,
				viewTransition: this.getViewTransition(transition)
			};

			newState[key + '_class'] = 'view';
			newState[key + '_props'] = props || {};

			xtend(newState, state);

			this.setState(newState);
		}
	};
}

module.exports = createApp;
},{"./constants/transition-keys":6,"./ui":35,"react/addons":undefined,"xtend/mutable":37}],8:[function(require,module,exports){
'use strict';

module.exports = '<?xml version="1.0" encoding="utf-8"?>' + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"' + '\t viewBox="-242 183.4 90 65.4" enable-background="new -242 183.4 90 65.4" xml:space="preserve">' + '<path class="svg-path" d="M-166,183.4H-205c-3.8,0-7.4,1.5-10.1,4.2l-25.6,25.6c-1.6,1.6-1.6,4.2,0,5.8l25.6,25.6c2.7,2.7,6.3,4.2,10.1,4.2h39.1' + '\tc7.9,0,14-6.4,14-14.3v-36.8C-152,189.8-158.1,183.4-166,183.4 M-169.8,228.4l-4.3,4.3l-12.3-12.3l-12.3,12.3l-4.3-4.3l12.3-12.3' + '\tl-12.3-12.3l4.3-4.3l12.3,12.3l12.3-12.3l4.3,4.3l-12.3,12.3L-169.8,228.4z"/>' + '</svg>';
},{}],9:[function(require,module,exports){
'use strict';

var React = require('react/addons');

/**
 * Touchstone Navigation Mixin
 * ===========================
 */

module.exports = {

	displayName: 'Navigation',

	contextTypes: {
		currentView: React.PropTypes.string,
		app: React.PropTypes.object.isRequired
	},

	showView: function showView() {
		this.context.app.showView.apply(this.context.app, arguments);
	},

	showViewFn: function showViewFn() {
		var args = arguments;
		return (function () {
			this.context.app.showView.apply(this.context.app, args);
		}).bind(this);
	}

};
},{"react/addons":undefined}],10:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');

var React = require('react/addons');
var Tappable = require('react-tappable');
var Navigation = require('../mixins/Navigation');

module.exports = React.createClass({
	displayName: 'ActionButton',
	mixins: [Navigation],

	getDefaultProps: function getDefaultProps() {
		return {
			component: 'button',
			disabled: false
		};
	},

	render: function render() {
		var className = classnames(this.props.className, this.props.icon, {
			'action-button': true,
			'disabled': this.props.disabled
		});

		var label = this.props.label ? React.createElement(
			'div',
			{ className: 'action-button-label' },
			this.props.label
		) : null;
		var curated = blacklist(this.props, {
			children: true,
			className: true,
			disabled: true,
			icon: true,
			label: true,
			showView: true,
			viewProps: true,
			viewTransition: true
		});

		// TODO: remove this behaviour in >0.2.0
		if (!curated.onTap && this.props.showView) {
			curated.onTap = this.showViewFn(this.props.showView, this.props.viewTransition, this.props.viewProps);
		}

		return React.createElement(
			'div',
			{ className: 'action-button-cell' },
			React.createElement(
				Tappable,
				_extends({ className: className }, curated),
				label,
				this.props.children
			)
		);
	}
});
},{"../mixins/Navigation":9,"blacklist":36,"classnames":1,"react-tappable":2,"react/addons":undefined}],11:[function(require,module,exports){
'use strict';

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ActionButtons',
	propTypes: {
		className: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},
	render: function render() {
		var className = this.props.className ? this.props.className + ' action-buttons' : 'action-buttons';
		return React.createElement(
			'div',
			{ className: className },
			this.props.children
		);
	}
});
},{"react/addons":undefined}],12:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var classnames = require('classnames');
var ViewContent = require('./ViewContent');

var alertTypes = ['default', 'primary', 'success', 'warning', 'danger'];

module.exports = React.createClass({
	displayName: 'Alertbar',
	propTypes: {
		className: React.PropTypes.string,
		height: React.PropTypes.string,
		pulse: React.PropTypes.bool,
		type: React.PropTypes.oneOf(alertTypes)
	},
	getDefaultProps: function getDefaultProps() {
		return {
			height: '30px',
			type: 'default'
		};
	},
	render: function render() {
		var className = classnames(this.props.className, this.props.type, {
			'Alertbar': true,
			'pulse': this.props.pulse
		});
		var content = this.props.pulse ? React.createElement(
			'div',
			{ className: 'Alertbar-inner' },
			this.props.children
		) : this.props.children;

		return React.createElement(
			ViewContent,
			{ height: this.props.height, className: className },
			content
		);
	}
});
},{"./ViewContent":34,"classnames":1,"react/addons":undefined}],13:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'exports',

	propTypes: {
		className: React.PropTypes.string,
		iconKey: React.PropTypes.string,
		iconType: React.PropTypes.string,
		header: React.PropTypes.string,
		subheader: React.PropTypes.string,
		text: React.PropTypes.string,
		actionText: React.PropTypes.string,
		actionFn: React.PropTypes.func
	},
	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},
	render: function render() {
		var className = this.props.className ? 'view-feedback ' + this.props.className : 'view-feedback';

		var icon = this.props.iconKey ? React.createElement('div', { className: 'view-feedback-icon ' + this.props.iconKey + ' ' + this.props.iconType }) : null;
		var header = this.props.header ? React.createElement(
			'div',
			{ className: 'view-feedback-header' },
			this.props.header
		) : null;
		var subheader = this.props.subheader ? React.createElement(
			'div',
			{ className: 'view-feedback-subheader' },
			this.props.subheader
		) : null;
		var text = this.props.text ? React.createElement('div', { className: 'view-feedback-text', dangerouslySetInnerHTML: { __html: this.props.text } }) : null;
		var action = this.props.actionText ? React.createElement(
			Tappable,
			{ onTap: this.props.actionFn, className: 'view-feedback-action' },
			this.props.actionText
		) : null;

		return React.createElement(
			'div',
			{ className: className },
			icon,
			header,
			subheader,
			text,
			action
		);
	}
});
},{"react-tappable":2,"react/addons":undefined}],14:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames'),
    ViewContent = require('./ViewContent');

module.exports = React.createClass({
	displayName: 'Footerbar',
	propTypes: {
		className: React.PropTypes.string,
		height: React.PropTypes.string,
		type: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			height: '44px'
		};
	},
	render: function render() {
		var className = classnames(this.props.className, this.props.type, {
			'Footerbar': true
		});

		return React.createElement(
			ViewContent,
			{ height: this.props.height, className: className },
			this.props.children
		);
	}
});
},{"./ViewContent":34,"classnames":1,"react/addons":undefined}],15:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('../mixins/Navigation');

module.exports = React.createClass({
	mixins: [Navigation],
	displayName: 'ActionButton',
	propTypes: {
		className: React.PropTypes.string,
		component: React.PropTypes.string,
		showView: React.PropTypes.string,
		viewTransition: React.PropTypes.string,
		viewProps: React.PropTypes.object,
		disabled: React.PropTypes.bool,
		onTap: React.PropTypes.func,
		active: React.PropTypes.bool,
		label: React.PropTypes.string,
		icon: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			component: 'div',
			disabled: false,
			active: false
		};
	},
	render: function render() {
		var className = classnames(this.props.className, this.props.icon, {
			'Footerbar-button': true,
			'active': this.props.active,
			'disabled': this.props.disabled
		});

		var label = this.props.label ? React.createElement(
			'div',
			{ className: 'Footerbar-button-label' },
			this.props.label
		) : null;
		var action = this.props.showView ? this.showViewFn(this.props.showView, this.props.viewTransition, this.props.viewProps) : this.props.onTap;

		return React.createElement(
			Tappable,
			{ className: className, component: this.props.component, onTap: action },
			label,
			this.props.children
		);
	}
});
},{"../mixins/Navigation":9,"classnames":1,"react-tappable":2,"react/addons":undefined}],16:[function(require,module,exports){
'use strict';

var classnames = require('classnames');

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'Headerbar',

	propTypes: {
		className: React.PropTypes.string,
		height: React.PropTypes.string,
		label: React.PropTypes.string,
		fixed: React.PropTypes.bool,
		type: React.PropTypes.string
	},

	render: function render() {
		var className = classnames('Headerbar', this.props.className, this.props.type, { 'fixed': this.props.fixed });

		var label;
		if (this.props.label !== undefined) {
			label = React.createElement(
				'div',
				{ className: 'Headerbar-label' },
				this.props.label
			);
		}

		return React.createElement(
			'div',
			{ height: this.props.height, className: className },
			this.props.children,
			label
		);
	}
});
},{"classnames":1,"react/addons":undefined}],17:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('../mixins/Navigation');

module.exports = React.createClass({
	displayName: 'HeaderbarButton',
	mixins: [Navigation],
	propTypes: {
		className: React.PropTypes.string,
		component: React.PropTypes.string,
		showView: React.PropTypes.string,
		viewTransition: React.PropTypes.string,
		viewProps: React.PropTypes.object,
		disabled: React.PropTypes.bool,
		visible: React.PropTypes.bool,
		primary: React.PropTypes.bool,
		onTap: React.PropTypes.func,
		position: React.PropTypes.string,
		label: React.PropTypes.string,
		icon: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			visible: true,
			disabled: false
		};
	},
	render: function render() {
		var className = classnames(this.props.className, this.props.position, this.props.icon, {
			'Headerbar-button': true,
			'hidden': !this.props.visible,
			'disabled': this.props.disabled,
			'is-primary': this.props.primary
		});

		var label = this.props.label ? React.createElement(
			'div',
			{ className: 'action-button-label' },
			this.props.label
		) : null;
		var action = this.props.showView ? this.showViewFn(this.props.showView, this.props.viewTransition, this.props.viewProps) : this.props.onTap;

		return React.createElement(
			Tappable,
			{ onTap: action, className: className, component: this.props.component },
			this.props.label,
			this.props.children
		);
	}
});
},{"../mixins/Navigation":9,"classnames":1,"react-tappable":2,"react/addons":undefined}],18:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'Input',

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'text'
		};
	},

	render: function render() {
		var disabled = this.props.disabled || this.props.readonly;
		var className = classnames(this.props.className, 'field-item list-item', {
			'is-first': this.props.first,
			'u-selectable': disabled
		});

		var curated = blacklist(this.props, {
			className: true,
			disabled: true,
			first: true,
			readonly: true,
			children: true
		});

		return React.createElement(
			'div',
			{ className: className },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'label',
					{ className: 'item-content' },
					React.createElement('input', _extends({ className: 'field', disabled: disabled }, curated))
				),
				this.props.children
			)
		);
	}
});
},{"blacklist":36,"classnames":1,"react/addons":undefined}],19:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'ItemMedia',
	propTypes: {
		className: React.PropTypes.string,
		icon: React.PropTypes.string,
		avatar: React.PropTypes.string,
		thumbnail: React.PropTypes.string
	},

	render: function render() {
		var className = classnames({
			'item-media': true,
			'is-icon': this.props.icon,
			'is-avatar': this.props.avatar || this.props.avatarInitials,
			'is-thumbnail': this.props.thumbnail
		}, this.props.className);

		// media types
		var icon = this.props.icon ? React.createElement('div', { className: 'item-icon ' + this.props.icon }) : null;
		var avatar = this.props.avatar || this.props.avatarInitials ? React.createElement(
			'div',
			{ className: 'item-avatar' },
			this.props.avatar ? React.createElement('img', { src: this.props.avatar }) : this.props.avatarInitials
		) : null;
		var thumbnail = this.props.thumbnail ? React.createElement(
			'div',
			{ className: 'item-thumbnail' },
			React.createElement('img', { src: this.props.thumbnail })
		) : null;

		return React.createElement(
			'div',
			{ className: className },
			icon,
			avatar,
			thumbnail
		);
	}
});
},{"classnames":1,"react/addons":undefined}],20:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'ItemNote',
	propTypes: {
		className: React.PropTypes.string,
		type: React.PropTypes.string,
		label: React.PropTypes.string,
		icon: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = classnames({
			'item-note': true
		}, this.props.type, this.props.className);

		// elements
		var label = this.props.label ? React.createElement(
			'div',
			{ className: 'item-note-label' },
			this.props.label
		) : null;
		var icon = this.props.icon ? React.createElement('div', { className: 'item-note-icon ' + this.props.icon }) : null;

		return React.createElement(
			'div',
			{ className: className },
			label,
			icon
		);
	}
});
},{"classnames":1,"react/addons":undefined}],21:[function(require,module,exports){
'use strict';

var classnames = require('classnames');
var icons = {
	del: require('../icons/delete')
};

var ViewContent = require('./ViewContent');
var KeypadButton = require('./KeypadButton');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'Keypad',
	propTypes: {
		action: React.PropTypes.func,
		className: React.PropTypes.string,
		stowed: React.PropTypes.bool,
		enableDel: React.PropTypes.bool,
		type: React.PropTypes.string, // options: 'black-translucent', 'white-translucent'
		wildkey: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var action = this.props.action;
		var typeName = 'Keypad--' + this.props.type;
		var keypadClassName = classnames(this.props.className, typeName, 'Keypad', {
			'is-stowed': this.props.stowed
		});

		var wildkey;

		if (this.props.wildkey === 'decimal') {
			wildkey = React.createElement(KeypadButton, { value: 'decimal', primaryLabel: '·', aux: true });
		} else {
			wildkey = React.createElement(KeypadButton, { aux: true, disabled: true });
		}

		return React.createElement(
			ViewContent,
			{ className: keypadClassName },
			React.createElement(KeypadButton, { action: function () {
					return action('1');
				}, primaryLabel: '1' }),
			React.createElement(KeypadButton, { action: function () {
					return action('2');
				}, primaryLabel: '2', secondaryLabel: 'ABC' }),
			React.createElement(KeypadButton, { action: function () {
					return action('3');
				}, primaryLabel: '3', secondaryLabel: 'DEF' }),
			React.createElement(KeypadButton, { action: function () {
					return action('4');
				}, primaryLabel: '4', secondaryLabel: 'GHI' }),
			React.createElement(KeypadButton, { action: function () {
					return action('5');
				}, primaryLabel: '5', secondaryLabel: 'JKL' }),
			React.createElement(KeypadButton, { action: function () {
					return action('6');
				}, primaryLabel: '6', secondaryLabel: 'MNO' }),
			React.createElement(KeypadButton, { action: function () {
					return action('7');
				}, primaryLabel: '7', secondaryLabel: 'PQRS' }),
			React.createElement(KeypadButton, { action: function () {
					return action('8');
				}, primaryLabel: '8', secondaryLabel: 'TUV' }),
			React.createElement(KeypadButton, { action: function () {
					return action('9');
				}, primaryLabel: '9', secondaryLabel: 'WXYZ' }),
			wildkey,
			React.createElement(KeypadButton, { action: function () {
					return action('0');
				}, primaryLabel: '0' }),
			React.createElement(KeypadButton, { action: function () {
					return action('delete');
				}, icon: icons.del, disabled: !this.props.enableDel, aux: true })
		);
	}
});
},{"../icons/delete":8,"./KeypadButton":22,"./ViewContent":34,"classnames":1,"react/addons":undefined}],22:[function(require,module,exports){
'use strict';

var classnames = require('classnames');

var React = require('react/addons');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'KeypadButton',
	propTypes: {
		action: React.PropTypes.func,
		aux: React.PropTypes.bool,
		className: React.PropTypes.string,
		'delete': React.PropTypes.bool,
		disabled: React.PropTypes.bool,
		primaryLabel: React.PropTypes.string,
		secondaryLabel: React.PropTypes.string,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			action: function action() {},
			className: '',
			secondaryLabel: ''
		};
	},

	render: function render() {
		var className = classnames('Keypad-button', {
			'is-auxiliary': this.props.aux || this.props['delete'],
			'disabled': this.props.disabled
		});

		var primaryLabel = this.props.primaryLabel ? React.createElement(
			'div',
			{ className: 'Keypad-button-primary-label' },
			this.props.primaryLabel
		) : null;
		var secondaryLabel = this.props.secondaryLabel ? React.createElement(
			'div',
			{ className: 'Keypad-button-secondary-label' },
			this.props.secondaryLabel
		) : null;
		var icon = this.props.icon ? React.createElement('span', { className: 'Keypad-button-icon', dangerouslySetInnerHTML: { __html: this.props.icon } }) : null;

		return React.createElement(
			'div',
			{ className: 'Keypad-cell' },
			React.createElement(
				Tappable,
				{ onTap: this.props.action, className: className, component: 'div' },
				icon,
				primaryLabel,
				secondaryLabel
			)
		);
	}
});
},{"classnames":1,"react-tappable":2,"react/addons":undefined}],23:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'LabelInput',
	propTypes: {
		className: React.PropTypes.string,
		onChange: React.PropTypes.func,
		type: React.PropTypes.string,
		label: React.PropTypes.string,
		pattern: React.PropTypes.string,
		placeholder: React.PropTypes.string,
		ref: React.PropTypes.string,
		alignTop: React.PropTypes.bool,
		readonly: React.PropTypes.bool,
		disabled: React.PropTypes.bool,
		first: React.PropTypes.bool
	},
	getDefaultProps: function getDefaultProps() {
		return {
			type: 'text',
			readonly: false
		};
	},
	render: function render() {
		var className = classnames(this.props.className, {
			'list-item': true,
			'field-item': true,
			'is-first': this.props.first,
			'align-top': this.props.alignTop,
			'u-selectable': this.props.disabled
		});

		var renderInput = this.props.readonly ? React.createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : React.createElement('input', { disabled: this.props.disabled, type: this.props.type, pattern: this.props.pattern, ref: this.props.ref, value: this.props.value, defaultValue: this.props.defaultValue, onChange: this.props.onChange, className: 'field', placeholder: this.props.placeholder });

		return React.createElement(
			'label',
			{ className: className },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				React.createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"classnames":1,"react/addons":undefined}],24:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'LabelSelect',
	propTypes: {
		className: React.PropTypes.string,
		label: React.PropTypes.string,
		first: React.PropTypes.bool
	},
	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},
	getInitialState: function getInitialState() {
		return {
			value: this.props.value
		};
	},
	updateInputValue: function updateInputValue(event) {
		this.setState({
			value: event.target.value
		});
	},
	render: function render() {
		// Set Classes
		var className = classnames(this.props.className, {
			'list-item': true,
			'is-first': this.props.first
		});

		// Map Options
		var options = this.props.options.map((function (op) {
			return React.createElement(
				'option',
				{ key: 'option-' + op.value, value: op.value },
				op.label
			);
		}).bind(this));

		return React.createElement(
			'label',
			{ className: className },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				React.createElement(
					'div',
					{ className: 'field-control' },
					React.createElement(
						'select',
						{ value: this.state.value, onChange: this.updateInputValue, className: 'select-field' },
						options
					),
					React.createElement(
						'div',
						{ className: 'select-field-indicator' },
						React.createElement('div', { className: 'select-field-indicator-arrow' })
					)
				)
			)
		);
	}
});
},{"classnames":1,"react/addons":undefined}],25:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'LabelTextarea',
	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},
	render: function render() {
		var disabled = this.props.disabled || this.props.readonly;
		var className = classnames(this.props.className, {
			'list-item': true,
			'field-item': true,
			'align-top': true,
			'is-first': this.props.first,
			'u-selectable': disabled
		});

		var curated = blacklist(this.props, {
			className: true,
			disabled: true,
			first: true,
			readonly: true,
			children: true,
			label: true
		});

		var renderInput = this.props.readonly ? React.createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : React.createElement('textarea', _extends({ disabled: disabled }, curated, { className: 'field' }));

		return React.createElement(
			'div',
			{ className: className },
			React.createElement(
				'label',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				React.createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"blacklist":36,"classnames":1,"react/addons":undefined}],26:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('../mixins/Navigation');

module.exports = React.createClass({
	displayName: 'LoadingButton',
	mixins: [Navigation],
	propTypes: {
		className: React.PropTypes.string,
		showView: React.PropTypes.string,
		viewTransition: React.PropTypes.string,
		viewProps: React.PropTypes.object,
		component: React.PropTypes.string,
		onTap: React.PropTypes.func,
		type: React.PropTypes.string,
		disabled: React.PropTypes.bool,
		loading: React.PropTypes.bool,
		label: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			disabled: false,
			loading: false
		};
	},
	render: function render() {
		// Class Name
		var className = classnames(this.props.className, this.props.type, {
			'loading-button': true,
			'disabled': this.props.disabled,
			'is-loading': this.props.loading
		});

		// Set Variables
		var label = this.props.label && !this.props.loading ? React.createElement(
			'div',
			{ className: 'loading-button-text' },
			this.props.label
		) : null;
		var onTap = this.props.showView ? this.showViewFn(this.props.showView, this.props.viewTransition, this.props.viewProps) : this.props.onTap;
		var loadingElements = this.props.loading ? React.createElement(
			'span',
			{ className: 'loading-button-icon-wrapper' },
			React.createElement('span', { className: 'loading-button-icon' })
		) : null;

		// Output Component
		return React.createElement(
			Tappable,
			{ className: className, component: this.props.component, onTap: onTap },
			loadingElements,
			label,
			this.props.children
		);
	}
});
},{"../mixins/Navigation":9,"classnames":1,"react-tappable":2,"react/addons":undefined}],27:[function(require,module,exports){
'use strict';

var classnames = require('classnames');

var React = require('react/addons');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'Modal',
	propTypes: {
		className: React.PropTypes.string,
		showModal: React.PropTypes.bool,
		loading: React.PropTypes.bool,
		mini: React.PropTypes.bool,
		iconKey: React.PropTypes.string,
		iconType: React.PropTypes.string,
		header: React.PropTypes.string,
		text: React.PropTypes.string,
		primaryActionText: React.PropTypes.string,
		primaryActionFn: React.PropTypes.func,
		secondaryActionText: React.PropTypes.string,
		secondaryActionFn: React.PropTypes.func
	},

	getDefaultProps: function getDefaultProps() {
		return {
			showModal: false
		};
	},

	getInitialState: function getInitialState() {
		return {
			showModal: this.props.showModal
		};
	},

	// TODO: use ReactTransitionGroup to handle fade in/out
	componentDidMount: function componentDidMount() {
		var self = this;

		setTimeout(function () {
			if (!self.isMounted()) return;

			self.setState({ showModal: true });
		}, 1);
	},

	render: function render() {
		// Set classnames
		var dialogClassName = classnames({
			'Modal-dialog': true,
			'Modal-mini': this.props.mini,
			'Modal-loading': this.props.loading
		}, this.props.className);
		var modalClassName = classnames('Modal', {
			'enter': this.state.showModal
		});

		// Set dynamic content
		var icon = this.props.iconKey ? React.createElement('div', { className: 'Modal-icon ' + this.props.iconKey + ' ' + this.props.iconType }) : null;
		var header = this.props.header ? React.createElement(
			'div',
			{ className: 'Modal-header' },
			this.props.header
		) : null;
		var text = this.props.text ? React.createElement('div', { className: 'Modal-text', dangerouslySetInnerHTML: { __html: this.props.text } }) : null;
		var primaryAction = this.props.primaryActionText ? React.createElement(
			Tappable,
			{ onTap: this.props.primaryActionFn, className: 'Modal-action Modal-action-primary' },
			this.props.primaryActionText
		) : null;
		var secondaryAction = this.props.secondaryActionText ? React.createElement(
			Tappable,
			{ onTap: this.props.secondaryActionFn, className: 'Modal-action Modal-action-secondary' },
			this.props.secondaryActionText
		) : null;

		var actions = primaryAction ? React.createElement(
			'div',
			{ className: 'Modal-actions' },
			secondaryAction,
			primaryAction
		) : null;

		return React.createElement(
			'div',
			{ className: modalClassName },
			React.createElement(
				'div',
				{ className: dialogClassName },
				icon,
				header,
				text,
				actions
			),
			React.createElement('div', { className: 'Modal-backdrop' })
		);
	}
});
},{"classnames":1,"react-tappable":2,"react/addons":undefined}],28:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames'),
    Keypad = require('./Keypad'),
    ViewContent = require('./ViewContent');

module.exports = React.createClass({
	displayName: 'Passcode',
	propTypes: {
		action: React.PropTypes.func,
		className: React.PropTypes.string,
		keyboardIsStowed: React.PropTypes.bool,
		type: React.PropTypes.string,
		helpText: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: '',
			helpText: 'Enter your passcode',
			type: 'default'
		};
	},

	getInitialState: function getInitialState() {
		return {
			helpText: this.props.helpText,
			keyboardIsStowed: true,
			passcode: ''
		};
	},

	componentDidMount: function componentDidMount() {
		// slide the keyboard up after the view is shown
		setTimeout((function () {
			if (!this.isMounted()) return;
			this.setState({
				keyboardIsStowed: false
			});
		}).bind(this), 400);
	},

	handlePasscode: function handlePasscode(keyCode) {

		var passcode = this.state.passcode;

		if (keyCode === 'delete') {
			passcode = passcode.slice(0, -1);
		} else {
			passcode = passcode.concat(keyCode);
		}

		if (passcode.length !== 4) {
			return this.setState({
				passcode: passcode
			});
		}

		setTimeout((function () {
			return this.props.action(passcode);
		}).bind(this), 200); // the transition that stows the keyboard takes 150ms, it freezes if interrupted by the ReactCSSTransitionGroup

		return this.setState({
			passcode: passcode
		});
	},

	render: function render() {

		var passcodeClassName = classnames(this.props.type, {
			'Passcode': true
		});

		return React.createElement(
			ViewContent,
			{ grow: true },
			React.createElement(
				'div',
				{ className: passcodeClassName },
				React.createElement(
					'div',
					{ className: 'Passcode-label' },
					this.props.helpText
				),
				React.createElement(
					'div',
					{ className: 'Passcode-fields' },
					React.createElement(
						'div',
						{ className: 'Passcode-field' },
						React.createElement('div', { className: 'Passcode-input ' + (this.state.passcode.length > 0 ? 'has-value' : '') })
					),
					React.createElement(
						'div',
						{ className: 'Passcode-field' },
						React.createElement('div', { className: 'Passcode-input ' + (this.state.passcode.length > 1 ? 'has-value' : '') })
					),
					React.createElement(
						'div',
						{ className: 'Passcode-field' },
						React.createElement('div', { className: 'Passcode-input ' + (this.state.passcode.length > 2 ? 'has-value' : '') })
					),
					React.createElement(
						'div',
						{ className: 'Passcode-field' },
						React.createElement('div', { className: 'Passcode-input ' + (this.state.passcode.length > 3 ? 'has-value' : '') })
					)
				)
			),
			React.createElement(Keypad, { type: this.props.type, action: this.handlePasscode, enableDel: Boolean(this.state.passcode.length), stowed: this.state.keyboardIsStowed })
		);
	}
});
},{"./Keypad":21,"./ViewContent":34,"classnames":1,"react/addons":undefined}],29:[function(require,module,exports){
'use strict';

var React = require('react');
var Tappable = require('react-tappable');

module.exports = React.createClass({

	displayName: 'RadioList',

	propTypes: {
		options: React.PropTypes.array,
		value: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
		icon: React.PropTypes.string,
		onChange: React.PropTypes.func
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {

		var options = this.props.options.map((function (op, i) {
			var className = 'list-item' + (i === 0 ? ' is-first' : '');
			var checkMark = op.value === this.props.value ? React.createElement(
				'div',
				{ className: 'item-note primary' },
				React.createElement('div', { className: 'item-note-icon ion-checkmark' })
			) : null;

			var icon = op.icon ? React.createElement(
				'div',
				{ className: 'item-media' },
				React.createElement('span', { className: 'item-icon primary ' + op.icon })
			) : null;

			return React.createElement(
				Tappable,
				{ key: 'option-' + i, onTap: this.onChange.bind(this, op.value), className: className },
				icon,
				React.createElement(
					'div',
					{ className: 'item-inner' },
					React.createElement(
						'div',
						{ className: 'item-title' },
						op.label
					),
					checkMark
				)
			);
		}).bind(this));

		return React.createElement(
			'div',
			null,
			options
		);
	}

});
},{"react":undefined,"react-tappable":2}],30:[function(require,module,exports){
'use strict';

var classnames = require('classnames');

var React = require('react');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'Switch',

	propTypes: {
		className: React.PropTypes.string,
		on: React.PropTypes.bool,
		type: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = classnames('switch', 'switch-' + this.props.type, { 'on': this.props.on });

		return React.createElement(
			Tappable,
			{ onTap: this.props.onTap, className: className, component: 'label' },
			React.createElement(
				'div',
				{ className: 'track' },
				React.createElement('div', { className: 'handle' })
			)
		);
	}
});
},{"classnames":1,"react":undefined,"react-tappable":2}],31:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'Textarea',

	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},

	render: function render() {
		var disabled = this.props.disabled || this.props.readonly;
		var className = classnames(this.props.className, 'field-item list-item', {
			'is-first': this.props.first,
			'u-selectable': disabled
		});

		var curated = blacklist(this.props, {
			children: true,
			className: true,
			disabled: true,
			first: true,
			inputRef: true,
			readonly: true
		});
		curated.ref = this.props.inputRef;

		return React.createElement(
			'div',
			{ className: className },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'label',
					{ className: 'item-content' },
					React.createElement('textarea', _extends({ className: 'field', disabled: disabled }, curated))
				),
				this.props.children
			)
		);
	}
});
},{"blacklist":36,"classnames":1,"react/addons":undefined}],32:[function(require,module,exports){
'use strict';

var React = require('react');
var classnames = require('classnames');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'Toggle',

	propTypes: {
		className: React.PropTypes.string,
		onChange: React.PropTypes.func.isRequired,
		options: React.PropTypes.array.isRequired,
		type: React.PropTypes.string,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'primary'
		};
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {

		var componentClassName = classnames(this.props.className, this.props.type, {
			'Toggle': true
		});

		var options = this.props.options.map((function (op) {
			var itemClassName = classnames({
				'Toggle-item': true,
				'active': op.value === this.props.value
			});
			return React.createElement(
				Tappable,
				{ key: 'option-' + op.value, onTap: this.onChange.bind(this, op.value), className: itemClassName },
				op.label
			);
		}).bind(this));

		return React.createElement(
			'div',
			{ className: componentClassName },
			options
		);
	}

});
},{"classnames":1,"react":undefined,"react-tappable":2}],33:[function(require,module,exports){
'use strict';

var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'View',

	propTypes: {
		className: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},

	render: function render() {
		var className = this.props.className ? 'View ' + this.props.className : 'View';

		// react does not currently support duplicate properties (which we need for vendor-prefixed values)
		// see https://github.com/facebook/react/issues/2020
		// moved the display properties to css/touchstone/view.less using the class ".View"

		// when supported, apply the following:
		// display: '-webkit-box',
		// display: '-webkit-flex',
		// display: '-moz-box',
		// display: '-moz-flex',
		// display: '-ms-flexbox',
		// display: 'flex',

		var inlineStyle = {
			WebkitFlexDirection: 'column',
			MozFlexDirection: 'column',
			msFlexDirection: 'column',
			FlexDirection: 'column',
			WebkitAlignItems: 'stretch',
			MozAlignItems: 'stretch',
			AlignItems: 'stretch',
			WebkitJustifyContent: 'space-between',
			MozJustifyContent: 'space-between',
			JustifyContent: 'space-between'
		};

		return React.createElement(
			'div',
			{ className: className, style: inlineStyle },
			this.props.children
		);
	}
});
},{"react/addons":undefined}],34:[function(require,module,exports){
'use strict';

var React = require('react/addons'),
    classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'ViewContent',
	propTypes: {
		id: React.PropTypes.string,
		className: React.PropTypes.string,
		height: React.PropTypes.string,
		scrollable: React.PropTypes.bool,
		grow: React.PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: '',
			height: ''
		};
	},

	render: function render() {
		var className = classnames({
			'ViewContent': true,
			'springy-scrolling': this.props.scrollable
		}, this.props.className);

		var inlineStyle = {};

		// set height on blocks if provided
		if (this.props.height) {
			inlineStyle.height = this.props.height;
		}

		// stretch to take up space
		if (this.props.grow) {
			inlineStyle.WebkitBoxFlex = '1';
			inlineStyle.WebkitFlex = '1';
			inlineStyle.MozBoxFlex = '1';
			inlineStyle.MozFlex = '1';
			inlineStyle.MsFlex = '1';
			inlineStyle.flex = '1';
		}

		// allow blocks to be scrollable
		if (this.props.scrollable) {
			inlineStyle.overflowY = 'auto';
			inlineStyle.WebkitOverflowScrolling = 'touch';
		}

		return React.createElement(
			'div',
			{ className: className, id: this.props.id, style: inlineStyle },
			this.props.children
		);
	}
});
},{"classnames":1,"react/addons":undefined}],35:[function(require,module,exports){
'use strict';

module.exports = {
	ActionButton: require('./ActionButton'),
	ActionButtons: require('./ActionButtons'),
	Alertbar: require('./Alertbar'),
	Feedback: require('./Feedback'),
	Footerbar: require('./Footerbar'),
	FooterbarButton: require('./FooterbarButton'),
	Headerbar: require('./Headerbar'),
	HeaderbarButton: require('./HeaderbarButton'),
	Input: require('./Input'),
	ItemMedia: require('./ItemMedia'),
	ItemNote: require('./ItemNote'),
	Keypad: require('./Keypad'),
	LabelInput: require('./LabelInput'),
	LabelSelect: require('./LabelSelect'),
	LabelTextarea: require('./LabelTextarea'),
	LoadingButton: require('./LoadingButton'),
	Modal: require('./Modal'),
	Passcode: require('./Passcode'),
	RadioList: require('./RadioList'),
	Switch: require('./Switch'),
	Textarea: require('./Textarea'),
	Toggle: require('./Toggle'),
	View: require('./View'),
	ViewContent: require('./ViewContent')
};
},{"./ActionButton":10,"./ActionButtons":11,"./Alertbar":12,"./Feedback":13,"./Footerbar":14,"./FooterbarButton":15,"./Headerbar":16,"./HeaderbarButton":17,"./Input":18,"./ItemMedia":19,"./ItemNote":20,"./Keypad":21,"./LabelInput":23,"./LabelSelect":24,"./LabelTextarea":25,"./LoadingButton":26,"./Modal":27,"./Passcode":28,"./RadioList":29,"./Switch":30,"./Textarea":31,"./Toggle":32,"./View":33,"./ViewContent":34}],36:[function(require,module,exports){
module.exports = function blacklist (src) {
  var copy = {}, filter = arguments[1]

  if (typeof filter === 'string') {
    filter = {}
    for (var i = 1; i < arguments.length; i++) {
      filter[arguments[i]] = true
    }
  }

  for (var key in src) {
    // blacklist?
    if (filter[key]) continue

    copy[key] = src[key]
  }

  return copy
}

},{}],37:[function(require,module,exports){
module.exports = extend

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],38:[function(require,module,exports){
'use strict';

module.exports = [{ name: 'December', number: '12', season: 'Summer' }, { name: 'January', number: '1', season: 'Summer' }, { name: 'February', number: '2', season: 'Summer' }, { name: 'March', number: '3', season: 'Autumn' }, { name: 'April', number: '4', season: 'Autumn' }, { name: 'May', number: '5', season: 'Autumn' }, { name: 'June', number: '6', season: 'Winter' }, { name: 'July', number: '7', season: 'Winter' }, { name: 'August', number: '8', season: 'Winter' }, { name: 'September', number: '9', season: 'Spring' }, { name: 'October', number: '10', season: 'Spring' }, { name: 'November', number: '11', season: 'Spring' }];

},{}],39:[function(require,module,exports){
'use strict';

module.exports = [{ name: { first: 'Benjamin', last: 'Lupton' }, joinedDate: 'Mar 8, 2009', location: 'Sydney, AU', img: 'https://avatars0.githubusercontent.com/u/61148?v=3&s=460', bio: '', flavour: 'vanilla' }, { name: { first: 'Boris', last: 'Bozic' }, joinedDate: 'Mar 12, 2013', location: 'Sydney, AU', img: 'https://avatars1.githubusercontent.com/u/3838716?v=3&s=460', bio: '', flavour: 'chocolate' }, { name: { first: 'Carlos', last: 'Colon' }, joinedDate: 'Nov 7, 2013', location: 'New Hampshire, USA', img: 'https://avatars3.githubusercontent.com/u/5872515?v=3&s=460', bio: '', flavour: 'caramel' }, { name: { first: 'David', last: 'Banham' }, joinedDate: 'Feb 22, 2011', location: 'Sydney, AU', img: 'https://avatars3.githubusercontent.com/u/631832?v=3&s=460', bio: '', flavour: 'strawberry' }, { name: { first: 'Frederic', last: 'Beaudet' }, joinedDate: 'Mar 12, 2013', location: 'Montreal', img: 'https://avatars0.githubusercontent.com/u/3833335?v=3&s=460', bio: '', flavour: 'strawberry' }, { name: { first: 'James', last: 'Allen' }, joinedDate: 'Feb 14, 2013', location: 'Manchester', img: '', bio: '', flavour: 'banana' }, { name: { first: 'Jed', last: 'Watson' }, joinedDate: 'Jun 24, 2011', location: 'Sydney, AU', img: 'https://avatars1.githubusercontent.com/u/872310?v=3&s=460', bio: '', flavour: 'banana' }, { name: { first: 'Joss', last: 'Mackison' }, joinedDate: 'Nov 6, 2012', location: 'Sydney, AU', img: 'https://avatars2.githubusercontent.com/u/2730833?v=3&s=460', bio: '', flavour: 'lemon' }, { name: { first: 'Johnny', last: 'Estilles' }, joinedDate: 'Sep 23, 2013', location: 'Philippines', img: '', bio: '', flavour: 'lemon' }, { name: { first: 'Markus', last: 'Padourek' }, joinedDate: 'Oct 17, 2012', location: 'London, UK', img: 'https://avatars2.githubusercontent.com/u/2580254?v=3&s=460', bio: '', flavour: 'pastaccio' }, { name: { first: 'Mike', last: 'Grabowski' }, joinedDate: 'Oct 2, 2012', location: 'London, UK', img: 'https://avatars3.githubusercontent.com/u/2464966?v=3&s=460', bio: '', flavour: 'vanilla' }, { name: { first: 'Rob', last: 'Morris' }, joinedDate: 'Oct 18, 2012', location: 'Sydney, AU', img: 'https://avatars3.githubusercontent.com/u/2587163?v=3&s=460', bio: '', flavour: 'chocolate' }, { name: { first: 'Simon', last: 'Taylor' }, joinedDate: 'Sep 14, 2013', location: 'Sydney, AU', img: 'https://avatars1.githubusercontent.com/u/5457267?v=3&s=460', bio: '', flavour: 'caramel' }, { name: { first: 'Steven', last: 'Steneker' }, joinedDate: 'Jun 30, 2008', location: 'Sydney, AU', img: 'https://avatars3.githubusercontent.com/u/15554?v=3&s=460', bio: '', flavour: 'strawberry' }, { name: { first: 'Tom', last: 'Walker' }, joinedDate: 'Apr 19, 2011', location: 'Sydney, AU', img: 'https://avatars2.githubusercontent.com/u/737821?v=3&s=460', bio: '', flavour: 'banana' }, { name: { first: 'Tuan', last: 'Hoang' }, joinedDate: 'Mar 19, 2013', location: 'Sydney, AU', img: 'https://avatars0.githubusercontent.com/u/3906505?v=3&s=460', bio: '', flavour: 'lemon' }];

},{}],40:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
var classnames = require('classnames');

var Touchstone = require('touchstonejs');

var config = require('./config');

var views = {

  // app
  'home': require('./views/home'),

  // components
  'component-feedback': require('./views/component/feedback'),

  'component-headerbar': require('./views/component/bar-header'),
  'component-headerbar-search': require('./views/component/bar-header-search'),
  'component-alertbar': require('./views/component/bar-alert'),
  'component-actionbar': require('./views/component/bar-action'),
  'component-footerbar': require('./views/component/bar-footer'),

  'component-passcode': require('./views/component/passcode'),
  'component-toggle': require('./views/component/toggle'),
  'component-form': require('./views/component/form'),

  'component-simple-list': require('./views/component/list-simple'),
  'component-complex-list': require('./views/component/list-complex'),
  'component-categorised-list': require('./views/component/list-categorised'),

  // transitions
  'transitions': require('./views/transitions'),
  'transitions-target': require('./views/transitions-target'),

  // details view
  'details': require('./views/details'),
  'radio-list': require('./views/radio-list')
};

var App = React.createClass({
  displayName: 'App',

  mixins: [Touchstone.createApp(views)],

  getInitialState: function getInitialState() {
    var startView = 'home';

    // resort to #viewName if it exists
    if (window.location.hash) {
      var hash = window.location.hash.slice(1);

      if (hash in views) startView = hash;
    }

    var initialState = {
      currentView: startView,
      isNativeApp: typeof cordova !== 'undefined'
    };

    return initialState;
  },

  gotoDefaultView: function gotoDefaultView() {
    this.showView('home', 'fade');
  },

  render: function render() {
    var appWrapperClassName = classnames({
      'app-wrapper': true,
      'is-native-app': this.state.isNativeApp
    });

    return React.createElement(
      'div',
      { className: appWrapperClassName },
      React.createElement(
        'div',
        { className: 'device-silhouette' },
        React.createElement(
          ReactCSSTransitionGroup,
          { transitionName: this.state.viewTransition.name, transitionEnter: this.state.viewTransition['in'], transitionLeave: this.state.viewTransition.out, className: 'view-wrapper', component: 'div' },
          this.getCurrentView()
        )
      ),
      React.createElement(
        'div',
        { className: 'demo-wrapper' },
        React.createElement('img', { className: 'meetuplogo', src: 'img/meetup-logo.png', alt: 'TouchstoneJS', width: '70' }),
        React.createElement('img', { src: 'img/logo-mark.svg', alt: 'TouchstoneJS', width: '40' }),
        React.createElement('img', { src: 'img/algolia-logo.png', alt: 'TouchstoneJS', width: '50' }),
        React.createElement(
          'h1',
          null,
          'Meetup / TouchstoneJS / Algolia'
        ),
        React.createElement(
          'small',
          null,
          'React Europe Hackathon'
        )
      )
    );
  }
});

function startApp() {
  React.render(React.createElement(App, null), document.getElementById('app'));
}

function onDeviceReady() {
  StatusBar.styleDefault();
  startApp();
}

if (typeof cordova === 'undefined') {
  startApp();
} else {
  document.addEventListener('deviceready', onDeviceReady, false);
}

},{"./config":41,"./views/component/bar-action":42,"./views/component/bar-alert":43,"./views/component/bar-footer":44,"./views/component/bar-header":46,"./views/component/bar-header-search":45,"./views/component/feedback":47,"./views/component/form":48,"./views/component/list-categorised":49,"./views/component/list-complex":50,"./views/component/list-simple":51,"./views/component/passcode":52,"./views/component/toggle":53,"./views/details":54,"./views/home":55,"./views/radio-list":56,"./views/transitions":58,"./views/transitions-target":57,"classnames":1,"react/addons":undefined,"touchstonejs":4}],41:[function(require,module,exports){
"use strict";

module.exports = {};

},{}],42:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	flashAlert: function flashAlert(alertContent) {
		alert(alertContent);
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Action Bar' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Label Only'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						UI.ActionButtons,
						null,
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Primary Action' }),
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Secondary Action' })
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Icon Only'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						UI.ActionButtons,
						null,
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), icon: 'ion-arrow-up-c' }),
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), icon: 'ion-arrow-down-c' })
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Icon & Label'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						UI.ActionButtons,
						null,
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Primary Action', icon: 'ion-arrow-up-c' }),
						React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Secondary Action', icon: 'ion-arrow-down-c' })
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Easily Customisable'
				),
				React.createElement(
					UI.ActionButtons,
					{ className: 'special' },
					React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Primary', icon: 'ion-android-contact' }),
					React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Secondary', icon: 'ion-android-contacts' }),
					React.createElement(UI.ActionButton, { onTap: this.flashAlert.bind(this, 'You tapped an action button.'), label: 'Tertiary', icon: 'ion-android-friends' })
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],43:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			alertType: 'default'
		};
	},

	handleAlertChange: function handleAlertChange(newAlertType) {

		this.setState({
			alertType: newAlertType
		});
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Alert Bar' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.Alertbar,
				{ type: this.state.alertType },
				'When the state is "',
				this.state.alertType,
				'"'
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel panel--first' },
					React.createElement(UI.RadioList, { value: this.state.alertType, onChange: this.handleAlertChange, options: [{ label: 'Default', value: 'default' }, { label: 'Primary', value: 'primary' }, { label: 'Success', value: 'success' }, { label: 'Warning', value: 'warning' }, { label: 'Danger', value: 'danger' }] })
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],44:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			typeKey: 'icon'
		};
	},

	handleFooterChange: function handleFooterChange(newType) {

		this.setState({
			typeKey: newType
		});
	},

	render: function render() {

		var footerbarClass = SetClass(this.state.typeKey, {
			'footerbar': true
		});
		var renderFooterbar;

		if (this.state.typeKey === 'icon') {
			renderFooterbar = React.createElement(
				UI.Footerbar,
				{ type: 'default' },
				React.createElement(UI.FooterbarButton, { icon: 'ion-ios7-arrow-left' }),
				React.createElement(UI.FooterbarButton, { icon: 'ion-ios7-arrow-right', disabled: true }),
				React.createElement(UI.FooterbarButton, { icon: 'ion-ios7-download' }),
				React.createElement(UI.FooterbarButton, { icon: 'ion-ios7-bookmarks-outline' }),
				React.createElement(UI.FooterbarButton, { icon: 'ion-ios7-browsers' })
			);
		} else if (this.state.typeKey === 'label') {
			renderFooterbar = React.createElement(
				UI.Footerbar,
				{ type: 'default' },
				React.createElement(UI.FooterbarButton, { label: 'Back' }),
				React.createElement(UI.FooterbarButton, { label: 'Forward', disabled: true }),
				React.createElement(UI.FooterbarButton, { label: 'Download' }),
				React.createElement(UI.FooterbarButton, { label: 'Bookmarks' }),
				React.createElement(UI.FooterbarButton, { label: 'Tabs' })
			);
		} else if (this.state.typeKey === 'both') {
			renderFooterbar = React.createElement(
				UI.Footerbar,
				{ type: 'default' },
				React.createElement(UI.FooterbarButton, { label: 'Back', icon: 'ion-ios7-arrow-left' }),
				React.createElement(UI.FooterbarButton, { label: 'Forward', icon: 'ion-ios7-arrow-right', disabled: true }),
				React.createElement(UI.FooterbarButton, { label: 'Download', icon: 'ion-ios7-download' }),
				React.createElement(UI.FooterbarButton, { label: 'Bookmarks', icon: 'ion-ios7-bookmarks-outline' }),
				React.createElement(UI.FooterbarButton, { label: 'Tabs', icon: 'ion-ios7-browsers' })
			);
		}

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Footer Bar' },
				React.createElement(
					Link,
					{ to: 'home', viewTransition: 'reveal-from-right', className: 'Headerbar-button ion-chevron-left', component: 'button' },
					'Back'
				)
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'view-feedback' },
					'Your app\'s amazing content here.'
				)
			),
			renderFooterbar
		);
	}
});
/*<div className="view-inner">
<UI.Toggle value={this.state.typeKey} onChange={this.handleFooterChange} options={[
	{ label: 'Icon', value: 'icon' },
	{ label: 'Label', value: 'label' },
	{ label: 'Both', value: 'both' }
]} />
</div>*/

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],45:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Navigation = require('touchstonejs').Navigation,
    Tappable = require('react-tappable'),
    UI = require('touchstonejs').UI;

var Timers = require('react-timers');
var Months = require('../../../data/months');

var Search = React.createClass({
	displayName: 'Search',

	mixins: [Timers()],

	propTypes: {
		searchString: React.PropTypes.string,
		onChange: React.PropTypes.func.isRequired
	},

	componentDidMount: function componentDidMount() {
		var self = this;

		this.setTimeout(function () {
			self.refs.input.getDOMNode().focus();
		}, 1000);
	},

	handleChange: function handleChange(event) {
		this.props.onChange(event.target.value);
	},

	reset: function reset() {
		this.props.onChange('');
		this.refs.input.getDOMNode().focus();
	},

	render: function render() {

		var clearIcon = Boolean(this.props.searchString.length) ? React.createElement(Tappable, { onTap: this.reset, className: 'Headerbar-form-clear ion-close-circled' }) : '';

		return React.createElement(
			UI.Headerbar,
			{ type: 'default', height: '36px', className: 'Headerbar-form Subheader' },
			React.createElement(
				'div',
				{ className: 'Headerbar-form-field Headerbar-form-icon ion-ios7-search-strong' },
				React.createElement('input', { ref: 'input', value: this.props.searchString, onChange: this.handleChange, className: 'Headerbar-form-input', placeholder: 'Search...' }),
				clearIcon
			)
		);
	}

});

var Item = React.createClass({
	displayName: 'Item',

	mixins: [Navigation],
	render: function render() {
		return React.createElement(
			'div',
			{ className: 'list-item' },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				this.props.month.name
			)
		);
	}
});

var List = React.createClass({
	displayName: 'List',

	getDefaultProps: function getDefaultProps() {
		return {
			searchString: ''
		};
	},

	render: function render() {

		var searchString = this.props.searchString;
		var months = [];
		var lastSeason = '';
		var renderList = React.createElement(
			'div',
			{ className: 'view-feedback-text' },
			'No match found...'
		);

		this.props.months.forEach(function (month, i) {

			// filter months
			if (searchString && month.name.toLowerCase().indexOf(searchString.toLowerCase()) === -1) {
				return;
			}

			// insert categories

			var season = month.season;

			if (lastSeason !== season) {
				lastSeason = season;

				months.push(React.createElement(
					'div',
					{ className: 'list-header', key: 'list-header-' + i },
					season
				));
			}

			// create list

			month.key = 'month-' + i;
			months.push(React.createElement(Item, { month: month }));
		});

		var wrapperClassName = SetClass(months.length ? 'panel mb-0' : 'view-feedback');

		if (months.length) {
			renderList = months;
		}

		return React.createElement(
			'div',
			{ className: wrapperClassName },
			renderList
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			searchString: '',
			months: Months
		};
	},

	updateSearch: function updateSearch(str) {
		this.setState({ searchString: str });
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Filter Months' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(Search, { searchString: this.state.searchString, onChange: this.updateSearch }),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(List, { months: this.state.months, searchString: this.state.searchString })
			)
		);
	}
});

},{"../../../data/months":38,"classnames":1,"react":undefined,"react-tappable":2,"react-timers":3,"touchstonejs":4}],46:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			typeKey: 'default'
		};
	},

	handleHeaderChange: function handleHeaderChange(newType) {

		this.setState({
			typeKey: newType
		});
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: this.state.typeKey, label: 'Header Bar' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', icon: 'ion-chevron-left', label: 'Back' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel panel--first' },
					React.createElement(UI.RadioList, { value: this.state.typeKey, onChange: this.handleHeaderChange, options: [{ label: 'Default', value: 'default' }, { label: 'Green', value: 'green' }, { label: 'Blue', value: 'blue' }, { label: 'Light Blue', value: 'light-blue' }, { label: 'Yellow', value: 'yellow' }, { label: 'Orange', value: 'orange' }, { label: 'Red', value: 'red' }, { label: 'Pink', value: 'pink' }, { label: 'Purple', value: 'purple' }] })
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],47:[function(require,module,exports){
'use strict';

var React = require('react');
var UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	flashAlert: function flashAlert(alertContent) {
		window.alert(alertContent);
	},

	render: function render() {
		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Feedback' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', icon: 'ion-chevron-left', label: 'Back' })
			),
			React.createElement(
				UI.ViewContent,
				null,
				React.createElement(UI.Feedback, { iconName: 'ion-compass', iconType: 'primary', header: 'Optional Header', subheader: 'Subheader, also optional', text: 'Feedback message copy goes here. It can be of any length.', actionText: 'Optional Action', actionFn: this.flashAlert.bind(this, 'You clicked the action.') })
			)
		);
	}
});

},{"react":undefined,"touchstonejs":4}],48:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			flavour: 'strawberry'
		};
	},

	handleFlavourChange: function handleFlavourChange(newFlavour) {

		this.setState({
			flavour: newFlavour
		});
	},

	handleSwitch: function handleSwitch(key, event) {
		var newState = {};
		newState[key] = !this.state[key];

		this.setState(newState);
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Form' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' }),
				React.createElement(UI.LoadingButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Save', className: 'Headerbar-button right is-primary' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Find an expert'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(UI.LabelSelect, { label: 'Skill', value: this.state.flavour, onChange: this.handleFlavourChange, options: [{ label: 'reactJs', value: 'reactjs' }] }),
					React.createElement(UI.LabelInput, { label: 'City', type: 'search', defaultValue: 'Paris', placeholder: 'Paris' })
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],49:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

var Months = require('../../../data/months');

var HeaderList = React.createClass({
	displayName: 'HeaderList',

	render: function render() {

		var months = [];
		var lastSeason = '';

		this.props.months.forEach(function (month, i) {

			var season = month.season;

			if (lastSeason !== season) {
				lastSeason = season;

				months.push(React.createElement(
					'div',
					{ className: 'list-header', key: 'list-header-' + i },
					season
				));
			}

			month.key = 'month-' + i;
			months.push(React.createElement(
				'div',
				{ className: 'list-item' },
				React.createElement(
					'div',
					{ className: 'item-inner' },
					month.name
				)
			));
		});

		return React.createElement(
			'div',
			{ className: 'panel mb-0' },
			months
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Categorised List' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', icon: 'ion-chevron-left', label: 'Back' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(HeaderList, { months: Months })
			)
		);
	}
});

},{"../../../data/months":38,"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],50:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

var People = require('../../../data/people');

var ComplexListItem = React.createClass({
	displayName: 'ComplexListItem',

	mixins: [Navigation],

	render: function render() {
		var initials = this.props.user.name.first.charAt(0).toUpperCase() + this.props.user.name.last.charAt(0).toUpperCase();

		return React.createElement(
			Link,
			{ to: 'details', viewTransition: 'show-from-right', params: { user: this.props.user, prevView: 'component-complex-list' }, className: 'list-item', component: 'div' },
			React.createElement(UI.ItemMedia, { avatar: this.props.user.img, avatarInitials: initials }),
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'item-content' },
					React.createElement(
						'div',
						{ className: 'item-title' },
						[this.props.user.name.first, this.props.user.name.last].join(' ')
					),
					React.createElement(
						'div',
						{ className: 'item-subtitle' },
						this.props.user.location
					)
				),
				React.createElement(UI.ItemNote, { type: 'default', label: this.props.user.joinedDate.slice(-4), icon: 'ion-chevron-right' })
			)
		);
	}
});

var ComplexList = React.createClass({
	displayName: 'ComplexList',

	render: function render() {

		var users = [];
		this.props.users.forEach(function (user, i) {
			user.key = 'user-' + i;
			users.push(React.createElement(ComplexListItem, { user: user }));
		});
		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'panel panel--first avatar-list' },
				users
			)
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', height: '36px', className: 'Headerbar-form Subheader' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(ComplexList, { users: People })
			)
		);
	}
});

},{"../../../data/people":39,"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],51:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

var People = require('../../../data/people');

var SimpleListItem = React.createClass({
	displayName: 'SimpleListItem',

	mixins: [Navigation],

	render: function render() {

		return React.createElement(
			Link,
			{ to: 'details', viewTransition: 'show-from-right', params: { user: this.props.user, prevView: 'component-simple-list' }, className: 'list-item is-tappable', component: 'div' },
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'item-title' },
					[this.props.user.name.first, this.props.user.name.last].join(' ')
				)
			)
		);
	}
});

var SimpleList = React.createClass({
	displayName: 'SimpleList',

	render: function render() {

		var users = [];

		this.props.users.forEach(function (user, i) {
			user.key = 'user-' + i;
			users.push(React.createElement(SimpleListItem, { user: user }));
		});

		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'panel panel--first' },
				users
			)
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Simple List' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(SimpleList, { users: People })
			)
		);
	}
});

},{"../../../data/people":39,"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],52:[function(require,module,exports){
'use strict';

var React = require('react'),
    Dialogs = require('touchstonejs').Dialogs,
    Navigation = require('touchstonejs').Navigation,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation, Dialogs],

	getInitialState: function getInitialState() {
		return {};
	},

	handlePasscode: function handlePasscode(passcode) {
		alert('Your passcode is "' + passcode + '".');

		this.showView('home', 'fade');
	},

	render: function render() {
		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Enter Passcode' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', icon: 'ion-chevron-left', label: 'Back' })
			),
			React.createElement(UI.Passcode, { action: this.handlePasscode, helpText: 'Enter a passcode' })
		);
	}
});

},{"react":undefined,"touchstonejs":4}],53:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

var Months = require('../../../data/months');

var MonthList = React.createClass({
	displayName: 'MonthList',

	render: function render() {

		var months = [];
		var lastSeason = '';
		var filterState = this.props.filterState;

		this.props.months.forEach(function (month, i) {

			if (filterState !== 'all' && filterState !== month.season.toLowerCase()) {
				return;
			}

			var season = month.season;

			if (lastSeason !== season) {
				lastSeason = season;

				months.push(React.createElement(
					'div',
					{ className: 'list-header', key: 'list-header-' + i },
					season
				));
			}

			month.key = 'month-' + i;
			months.push(React.createElement(
				'div',
				{ className: 'list-item' },
				React.createElement(
					'div',
					{ className: 'item-inner' },
					month.name
				)
			));
		});

		return React.createElement(
			'div',
			{ className: 'panel mb-0' },
			months
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			activeToggleItemKey: 'all',
			typeKey: 'primary',
			months: Months
		};
	},

	handleToggleActiveChange: function handleToggleActiveChange(newItem) {

		var selectedItem = newItem;

		if (this.state.activeToggleItemKey === newItem) {
			selectedItem = 'all';
		}

		this.setState({
			activeToggleItemKey: selectedItem
		});
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Toggle' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.Headerbar,
				{ type: 'default', height: '36px', className: 'Subheader' },
				React.createElement(UI.Toggle, { value: this.state.activeToggleItemKey, onChange: this.handleToggleActiveChange, options: [{ label: 'Summer', value: 'summer' }, { label: 'Autumn', value: 'autumn' }, { label: 'Winter', value: 'winter' }, { label: 'Spring', value: 'spring' }] })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(MonthList, { months: this.state.months, filterState: this.state.activeToggleItemKey })
			)
		);
	}
});

},{"../../../data/months":38,"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],54:[function(require,module,exports){
'use strict';

var React = require('react'),
    Tappable = require('react-tappable'),
    Dialogs = require('touchstonejs').Dialogs,
    Navigation = require('touchstonejs').Navigation,
    UI = require('touchstonejs').UI;

var Timers = require('react-timers');

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation, Dialogs, Timers()],

	getDefaultProps: function getDefaultProps() {
		return {
			prevView: 'home'
		};
	},

	getInitialState: function getInitialState() {
		return {
			processing: false,
			formIsValid: false,
			bioValue: this.props.user.bio || ''
		};
	},

	showFlavourList: function showFlavourList() {
		this.showView('radio-list', 'show-from-right', { user: this.props.user, flavour: this.state.flavour });
	},

	handleBioInput: function handleBioInput(event) {
		this.setState({
			bioValue: event.target.value,
			formIsValid: event.target.value.length ? true : false
		});
	},

	processForm: function processForm() {
		var self = this;

		this.setState({ processing: true });

		this.setTimeout(function () {
			self.showView('home', 'fade', {});
		}, 750);
	},

	flashAlert: function flashAlert(alertContent, callback) {
		return callback(this.showAlertDialog({ message: alertContent }));
	},

	render: function render() {

		// fields
		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: [this.props.user.name.first, this.props.user.name.last].join(' ') },
				React.createElement(UI.HeaderbarButton, { showView: this.props.prevView, viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' }),
				React.createElement(UI.LoadingButton, { loading: this.state.processing, disabled: !this.state.formIsValid, onTap: this.processForm, label: 'Save', className: 'Headerbar-button right is-primary' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel panel--first' },
					React.createElement(UI.LabelInput, { label: 'Location', value: this.props.user.location, placeholder: 'Suburb, Country' }),
					React.createElement(UI.LabelInput, { label: 'Joined', value: this.props.user.joinedDate, placeholder: 'Date' }),
					React.createElement(UI.LabelTextarea, { label: 'Note', value: this.state.bioValue, placeholder: '(required)', onChange: this.handleBioInput })
				),
				React.createElement(
					Tappable,
					{ onTap: this.flashAlert.bind(this, 'You clicked the Primary Button.'), className: 'panel-button primary', component: 'button' },
					'I\'ve talked to him'
				)
			)
		);
	}
});
/*<div className="panel-header text-caps">Basic details</div>*/

},{"react":undefined,"react-tappable":2,"react-timers":3,"touchstonejs":4}],55:[function(require,module,exports){
'use strict';

var React = require('react');
var Tappable = require('react-tappable');
var Navigation = require('touchstonejs').Navigation;
var Link = require('touchstonejs').Link;
var UI = require('touchstonejs').UI;
var SetClass = require('classnames');

var Timers = require('react-timers');

var People = require('../../data/people');

var ComplexListItem = React.createClass({
	displayName: 'ComplexListItem',

	mixins: [Navigation],

	render: function render() {
		var initials = this.props.user.name.first.charAt(0).toUpperCase() + this.props.user.name.last.charAt(0).toUpperCase();

		return React.createElement(
			Link,
			{ to: 'details', viewTransition: 'show-from-right', params: { user: this.props.user, prevView: 'component-complex-list' }, className: 'list-item', component: 'div' },
			React.createElement(UI.ItemMedia, { avatar: this.props.user.img, avatarInitials: initials }),
			React.createElement(
				'div',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'item-content' },
					React.createElement(
						'div',
						{ className: 'item-title' },
						[this.props.user.name.first, this.props.user.name.last].join(' ')
					),
					React.createElement(
						'div',
						{ className: 'item-subtitle' },
						this.props.user.location
					)
				),
				React.createElement(UI.ItemNote, { type: 'default', label: this.props.user.joinedDate.slice(-4), icon: 'ion-chevron-right' })
			)
		);
	}
});

var ComplexList = React.createClass({
	displayName: 'ComplexList',

	render: function render() {
		var users = [];
		this.props.users.forEach(function (user, i) {
			user.key = 'user-' + i;
			users.push(React.createElement(ComplexListItem, { user: user }));
		});
		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'panel panel--first avatar-list' },
				users
			)
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	render: function render() {
		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', height: '36px', className: 'Headerbar-form Subheader' },
				React.createElement(UI.HeaderbarButton, { showView: 'component-form', viewTransition: 'reveal-from-left', className: 'Headerbar-button right', label: 'Settings' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(ComplexList, { users: People })
			)
		);
	}
});

},{"../../data/people":39,"classnames":1,"react":undefined,"react-tappable":2,"react-timers":3,"touchstonejs":4}],56:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Tappable = require('react-tappable'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	getInitialState: function getInitialState() {
		return {
			flavour: this.props.user.flavour
		};
	},

	handleFlavourChange: function handleFlavourChange(newFlavour) {

		this.setState({
			flavour: newFlavour
		});
	},

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Favourite Icecream' },
				React.createElement(UI.HeaderbarButton, { showView: 'details', viewTransition: 'reveal-from-right', viewProps: { user: this.props.user, flavour: this.state.flavour }, label: 'Details', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel panel--first' },
					React.createElement(UI.RadioList, { value: this.state.flavour, onChange: this.handleFlavourChange, options: [{ label: 'Vanilla', value: 'vanilla' }, { label: 'Chocolate', value: 'chocolate' }, { label: 'Caramel', value: 'caramel' }, { label: 'Strawberry', value: 'strawberry' }, { label: 'Banana', value: 'banana' }, { label: 'Lemon', value: 'lemon' }, { label: 'Pastaccio', value: 'pastaccio' }] })
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"react-tappable":2,"touchstonejs":4}],57:[function(require,module,exports){
'use strict';

var React = require('react'),
    Navigation = require('touchstonejs').Navigation,
    UI = require('touchstonejs').UI;

var Timers = require('react-timers');

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation, Timers()],

	componentDidMount: function componentDidMount() {
		var self = this;

		this.setTimeout(function () {
			self.showView('transitions', 'fade');
		}, 1000);
	},

	render: function render() {
		return React.createElement(
			UI.View,
			null,
			React.createElement(UI.Headerbar, { type: 'default', label: 'Target View' }),
			React.createElement(
				UI.ViewContent,
				null,
				React.createElement(UI.Feedback, { iconKey: 'ion-ios7-photos', iconType: 'muted', text: 'Hold on a sec...' })
			)
		);
	}
});

},{"react":undefined,"react-timers":3,"touchstonejs":4}],58:[function(require,module,exports){
'use strict';

var React = require('react'),
    SetClass = require('classnames'),
    Navigation = require('touchstonejs').Navigation,
    Link = require('touchstonejs').Link,
    UI = require('touchstonejs').UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation],

	render: function render() {

		return React.createElement(
			UI.View,
			null,
			React.createElement(
				UI.Headerbar,
				{ type: 'default', label: 'Transitions' },
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', icon: 'ion-chevron-left', label: 'Back' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Default'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ to: 'transitions-target', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'None'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Fade'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'fade', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Fade'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'fade-expand', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Fade Expand'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'fade-contract', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Fade Contract'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Show'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'show-from-left', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Show from Left'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'show-from-right', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Show from Right'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'show-from-top', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Show from Top'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'show-from-bottom', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Show from Bottom'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Reveal'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'reveal-from-left', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Reveal from Left'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'reveal-from-right', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Reveal from Right'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'reveal-from-top', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Reveal from Top'
						)
					),
					React.createElement(
						Link,
						{ to: 'transitions-target', viewTransition: 'reveal-from-bottom', className: 'list-item is-tappable', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Reveal from Bottom'
						)
					)
				)
			)
		);
	}
});

},{"classnames":1,"react":undefined,"touchstonejs":4}]},{},[40])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMtdGFza3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jbGFzc25hbWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlYWN0LXRhcHBhYmxlL2xpYi9UYXBwYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC10aW1lcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29tcG9uZW50cy9MaW5rLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29uc3RhbnRzL3RyYW5zaXRpb24ta2V5cy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2NyZWF0ZUFwcC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2ljb25zL2RlbGV0ZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL21peGlucy9OYXZpZ2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQWN0aW9uQnV0dG9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQWN0aW9uQnV0dG9ucy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0FsZXJ0YmFyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvRmVlZGJhY2suanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Gb290ZXJiYXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Gb290ZXJiYXJCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9IZWFkZXJiYXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9IZWFkZXJiYXJCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1NZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1Ob3RlLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvS2V5cGFkLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvS2V5cGFkQnV0dG9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxJbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xhYmVsU2VsZWN0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxUZXh0YXJlYS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xvYWRpbmdCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Nb2RhbC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1Bhc3Njb2RlLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvUmFkaW9MaXN0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvU3dpdGNoLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvVGV4dGFyZWEuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Ub2dnbGUuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9WaWV3LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvVmlld0NvbnRlbnQuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbm9kZV9tb2R1bGVzL2JsYWNrbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbm9kZV9tb2R1bGVzL3h0ZW5kL211dGFibGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvZGF0YS9tb250aHMuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvZGF0YS9wZW9wbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvYXBwLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL2NvbmZpZy5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWFjdGlvbi5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWFsZXJ0LmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC9iYXItZm9vdGVyLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC9iYXItaGVhZGVyLXNlYXJjaC5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWhlYWRlci5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvZmVlZGJhY2suanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2Zvcm0uanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2xpc3QtY2F0ZWdvcmlzZWQuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2xpc3QtY29tcGxleC5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvbGlzdC1zaW1wbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L3Bhc3Njb2RlLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC90b2dnbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvZGV0YWlscy5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9ob21lLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL3JhZGlvLWxpc3QuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvdHJhbnNpdGlvbnMtdGFyZ2V0LmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL3RyYW5zaXRpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNmQSxNQUFNLENBQUMsT0FBTyxHQUFHLENBQ2hCLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBSSxNQUFNLEVBQUUsSUFBSSxFQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFDdkQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFLLE1BQU0sRUFBRSxHQUFHLEVBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUN2RCxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUksTUFBTSxFQUFFLEdBQUcsRUFBSSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQ3ZELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBTyxNQUFNLEVBQUUsR0FBRyxFQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFDdkQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFPLE1BQU0sRUFBRSxHQUFHLEVBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUN2RCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQVMsTUFBTSxFQUFFLEdBQUcsRUFBSSxNQUFNLEVB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QVMsRUFBQyx1QkFBdUIsRUFBQyxTQUFTLEVBQUMsS0FBSztNQUFDOztTQUFLLFNBQVMsRUFBQyxZQUFZOztPQUF5QjtNQUFPO0tBQzFLO0lBQ1U7R0FDUixDQUNUO0VBQ0Y7Q0FDRCxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gIENvcHlyaWdodCAoYykgMjAxNSBKZWQgV2F0c29uLlxuICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UgKE1JVCksIHNlZVxuICBodHRwOi8vamVkd2F0c29uLmdpdGh1Yi5pby9jbGFzc25hbWVzXG4qL1xuXG4oZnVuY3Rpb24gKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY2xhc3NOYW1lcyAoKSB7XG5cblx0XHR2YXIgY2xhc3NlcyA9ICcnO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRpZiAoIWFyZykgY29udGludWU7XG5cblx0XHRcdHZhciBhcmdUeXBlID0gdHlwZW9mIGFyZztcblxuXHRcdFx0aWYgKCdzdHJpbmcnID09PSBhcmdUeXBlIHx8ICdudW1iZXInID09PSBhcmdUeXBlKSB7XG5cdFx0XHRcdGNsYXNzZXMgKz0gJyAnICsgYXJnO1xuXG5cdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuXHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGNsYXNzTmFtZXMuYXBwbHkobnVsbCwgYXJnKTtcblxuXHRcdFx0fSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gYXJnVHlwZSkge1xuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIGFyZ1trZXldKSB7XG5cdFx0XHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGtleTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY2xhc3Nlcy5zdWJzdHIoMSk7XG5cdH1cblxuXHRpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cblx0XHRkZWZpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIGNsYXNzTmFtZXM7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNsYXNzTmFtZXM7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LmNsYXNzTmFtZXMgPSBjbGFzc05hbWVzO1xuXHR9XG5cbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbi8vIEVuYWJsZSBSZWFjdCBUb3VjaCBFdmVudHNcblJlYWN0LmluaXRpYWxpemVUb3VjaEV2ZW50cyh0cnVlKTtcblxuZnVuY3Rpb24gZ2V0VG91Y2hQcm9wcyh0b3VjaCkge1xuXHRpZiAoIXRvdWNoKSByZXR1cm4ge307XG5cdHJldHVybiB7XG5cdFx0cGFnZVg6IHRvdWNoLnBhZ2VYLFxuXHRcdHBhZ2VZOiB0b3VjaC5wYWdlWSxcblx0XHRjbGllbnRYOiB0b3VjaC5jbGllbnRYLFxuXHRcdGNsaWVudFk6IHRvdWNoLmNsaWVudFlcblx0fTtcbn1cblxuZnVuY3Rpb24gaXNEYXRhT3JBcmlhUHJvcChrZXkpIHtcblx0cmV0dXJuIGtleS5pbmRleE9mKCdkYXRhLScpID09PSAwIHx8IGtleS5pbmRleE9mKCdhcmlhLScpID09PSAwO1xufVxuXG5mdW5jdGlvbiBnZXRQaW5jaFByb3BzKHRvdWNoZXMpIHtcblx0cmV0dXJuIHtcblx0XHR0b3VjaGVzOiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwodG91Y2hlcywgZnVuY3Rpb24gY29weVRvdWNoKHRvdWNoKSB7XG5cdFx0XHRyZXR1cm4geyBpZGVudGlmaWVyOiB0b3VjaC5pZGVudGlmaWVyLCBwYWdlWDogdG91Y2gucGFnZVgsIHBhZ2VZOiB0b3VjaC5wYWdlWSB9O1xuXHRcdH0pLFxuXHRcdGNlbnRlcjogeyB4OiAodG91Y2hlc1swXS5wYWdlWCArIHRvdWNoZXNbMV0ucGFnZVgpIC8gMiwgeTogKHRvdWNoZXNbMF0ucGFnZVkgKyB0b3VjaGVzWzFdLnBhZ2VZKSAvIDIgfSxcblx0XHRhbmdsZTogTWF0aC5hdGFuKCkgKiAodG91Y2hlc1sxXS5wYWdlWSAtIHRvdWNoZXNbMF0ucGFnZVkpIC8gKHRvdWNoZXNbMV0ucGFnZVggLSB0b3VjaGVzWzBdLnBhZ2VYKSAqIDE4MCAvIE1hdGguUEksXG5cdFx0ZGlzdGFuY2U6IE1hdGguc3FydChNYXRoLnBvdyhNYXRoLmFicyh0b3VjaGVzWzFdLnBhZ2VYIC0gdG91Y2hlc1swXS5wYWdlWCksIDIpICsgTWF0aC5wb3coTWF0aC5hYnModG91Y2hlc1sxXS5wYWdlWSAtIHRvdWNoZXNbMF0ucGFnZVkpLCAyKSlcblx0fTtcbn1cblxuLyoqXG4gKiBUYXBwYWJsZSBNaXhpblxuICogPT09PT09PT09PT09PT1cbiAqL1xuXG52YXIgTWl4aW4gPSB7XG5cdHByb3BUeXBlczoge1xuXHRcdG1vdmVUaHJlc2hvbGQ6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsIC8vIHBpeGVscyB0byBtb3ZlIGJlZm9yZSBjYW5jZWxsaW5nIHRhcFxuXHRcdGFjdGl2ZURlbGF5OiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBtcyB0byB3YWl0IGJlZm9yZSBhZGRpbmcgdGhlIGAtYWN0aXZlYCBjbGFzc1xuXHRcdHByZXNzRGVsYXk6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsIC8vIG1zIHRvIHdhaXQgYmVmb3JlIGRldGVjdGluZyBhIHByZXNzXG5cdFx0cHJlc3NNb3ZlVGhyZXNob2xkOiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBwaXhlbHMgdG8gbW92ZSBiZWZvcmUgY2FuY2VsbGluZyBwcmVzc1xuXHRcdHByZXZlbnREZWZhdWx0OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgLy8gd2hldGhlciB0byBwcmV2ZW50RGVmYXVsdCBvbiBhbGwgZXZlbnRzXG5cdFx0c3RvcFByb3BhZ2F0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgLy8gd2hldGhlciB0byBzdG9wUHJvcGFnYXRpb24gb24gYWxsIGV2ZW50c1xuXG5cdFx0b25UYXA6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBmaXJlcyB3aGVuIGEgdGFwIGlzIGRldGVjdGVkXG5cdFx0b25QcmVzczogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIGZpcmVzIHdoZW4gYSBwcmVzcyBpcyBkZXRlY3RlZFxuXHRcdG9uVG91Y2hTdGFydDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCB0b3VjaCBldmVudFxuXHRcdG9uVG91Y2hNb3ZlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIHRvdWNoIGV2ZW50XG5cdFx0b25Ub3VjaEVuZDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCB0b3VjaCBldmVudFxuXHRcdG9uTW91c2VEb3duOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIG1vdXNlIGV2ZW50XG5cdFx0b25Nb3VzZVVwOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIG1vdXNlIGV2ZW50XG5cdFx0b25Nb3VzZU1vdmU6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBwYXNzLXRocm91Z2ggbW91c2UgZXZlbnRcblx0XHRvbk1vdXNlT3V0OiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIG1vdXNlIGV2ZW50XG5cblx0XHRvblBpbmNoU3RhcnQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBmaXJlcyB3aGVuIGEgcGluY2ggZ2VzdHVyZSBpcyBzdGFydGVkXG5cdFx0b25QaW5jaE1vdmU6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBmaXJlcyBvbiBldmVyeSB0b3VjaC1tb3ZlIHdoZW4gYSBwaW5jaCBhY3Rpb24gaXMgYWN0aXZlXG5cdFx0b25QaW5jaEVuZDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMgLy8gZmlyZXMgd2hlbiBhIHBpbmNoIGFjdGlvbiBlbmRzXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFjdGl2ZURlbGF5OiAwLFxuXHRcdFx0bW92ZVRocmVzaG9sZDogMTAwLFxuXHRcdFx0cHJlc3NEZWxheTogMTAwMCxcblx0XHRcdHByZXNzTW92ZVRocmVzaG9sZDogNVxuXHRcdH07XG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGlzQWN0aXZlOiBmYWxzZSxcblx0XHRcdHRvdWNoQWN0aXZlOiBmYWxzZSxcblx0XHRcdHBpbmNoQWN0aXZlOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHRoaXMuY2xlYW51cFNjcm9sbERldGVjdGlvbigpO1xuXHRcdHRoaXMuY2FuY2VsUHJlc3NEZXRlY3Rpb24oKTtcblx0XHR0aGlzLmNsZWFyQWN0aXZlVGltZW91dCgpO1xuXHR9LFxuXG5cdHByb2Nlc3NFdmVudDogZnVuY3Rpb24gcHJvY2Vzc0V2ZW50KGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMucHJvcHMucHJldmVudERlZmF1bHQpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0aWYgKHRoaXMucHJvcHMuc3RvcFByb3BhZ2F0aW9uKSBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSxcblxuXHRvblRvdWNoU3RhcnQ6IGZ1bmN0aW9uIG9uVG91Y2hTdGFydChldmVudCkge1xuXHRcdGlmICh0aGlzLnByb3BzLm9uVG91Y2hTdGFydCAmJiB0aGlzLnByb3BzLm9uVG91Y2hTdGFydChldmVudCkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cyA9IHRydWU7XG5cdFx0aWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHR0aGlzLl9pbml0aWFsVG91Y2ggPSB0aGlzLl9sYXN0VG91Y2ggPSBnZXRUb3VjaFByb3BzKGV2ZW50LnRvdWNoZXNbMF0pO1xuXHRcdFx0dGhpcy5pbml0U2Nyb2xsRGV0ZWN0aW9uKCk7XG5cdFx0XHR0aGlzLmluaXRQcmVzc0RldGVjdGlvbihldmVudCwgdGhpcy5lbmRUb3VjaCk7XG5cdFx0XHR0aGlzLl9hY3RpdmVUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLm1ha2VBY3RpdmUsIHRoaXMucHJvcHMuYWN0aXZlRGVsYXkpO1xuXHRcdH0gZWxzZSBpZiAoKHRoaXMucHJvcHMub25QaW5jaFN0YXJ0IHx8IHRoaXMucHJvcHMub25QaW5jaE1vdmUgfHwgdGhpcy5wcm9wcy5vblBpbmNoRW5kKSAmJiBldmVudC50b3VjaGVzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy5vblBpbmNoU3RhcnQoZXZlbnQpO1xuXHRcdH1cblx0fSxcblxuXHRtYWtlQWN0aXZlOiBmdW5jdGlvbiBtYWtlQWN0aXZlKCkge1xuXHRcdGlmICghdGhpcy5pc01vdW50ZWQoKSkgcmV0dXJuO1xuXHRcdHRoaXMuY2xlYXJBY3RpdmVUaW1lb3V0KCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRpc0FjdGl2ZTogdHJ1ZVxuXHRcdH0pO1xuXHR9LFxuXG5cdGNsZWFyQWN0aXZlVGltZW91dDogZnVuY3Rpb24gY2xlYXJBY3RpdmVUaW1lb3V0KCkge1xuXHRcdGNsZWFyVGltZW91dCh0aGlzLl9hY3RpdmVUaW1lb3V0KTtcblx0XHR0aGlzLl9hY3RpdmVUaW1lb3V0ID0gZmFsc2U7XG5cdH0sXG5cblx0b25QaW5jaFN0YXJ0OiBmdW5jdGlvbiBvblBpbmNoU3RhcnQoZXZlbnQpIHtcblx0XHQvLyBpbiBjYXNlIHRoZSB0d28gdG91Y2hlcyBkaWRuJ3Qgc3RhcnQgZXhhY3RseSBhdCB0aGUgc2FtZSB0aW1lXG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5lbmRUb3VjaCgpO1xuXHRcdH1cblx0XHR2YXIgdG91Y2hlcyA9IGV2ZW50LnRvdWNoZXM7XG5cdFx0dGhpcy5faW5pdGlhbFBpbmNoID0gZ2V0UGluY2hQcm9wcyh0b3VjaGVzKTtcblx0XHR0aGlzLl9pbml0aWFsUGluY2ggPSBfZXh0ZW5kcyh0aGlzLl9pbml0aWFsUGluY2gsIHtcblx0XHRcdGRpc3BsYWNlbWVudDogeyB4OiAwLCB5OiAwIH0sXG5cdFx0XHRkaXNwbGFjZW1lbnRWZWxvY2l0eTogeyB4OiAwLCB5OiAwIH0sXG5cdFx0XHRyb3RhdGlvbjogMCxcblx0XHRcdHJvdGF0aW9uVmVsb2NpdHk6IDAsXG5cdFx0XHR6b29tOiAxLFxuXHRcdFx0em9vbVZlbG9jaXR5OiAwLFxuXHRcdFx0dGltZTogRGF0ZS5ub3coKVxuXHRcdH0pO1xuXHRcdHRoaXMuX2xhc3RQaW5jaCA9IHRoaXMuX2luaXRpYWxQaW5jaDtcblx0XHR0aGlzLnByb3BzLm9uUGluY2hTdGFydCAmJiB0aGlzLnByb3BzLm9uUGluY2hTdGFydCh0aGlzLl9pbml0aWFsUGluY2gsIGV2ZW50KTtcblx0fSxcblxuXHRvblBpbmNoTW92ZTogZnVuY3Rpb24gb25QaW5jaE1vdmUoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5faW5pdGlhbFRvdWNoKSB7XG5cdFx0XHR0aGlzLmVuZFRvdWNoKCk7XG5cdFx0fVxuXHRcdHZhciB0b3VjaGVzID0gZXZlbnQudG91Y2hlcztcblx0XHRpZiAodG91Y2hlcy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHJldHVybiB0aGlzLm9uUGluY2hFbmQoZXZlbnQpIC8vIGJhaWwgb3V0IGJlZm9yZSBkaXNhc3RlclxuXHRcdFx0O1xuXHRcdH1cblxuXHRcdHZhciBjdXJyZW50UGluY2ggPSB0b3VjaGVzWzBdLmlkZW50aWZpZXIgPT09IHRoaXMuX2luaXRpYWxQaW5jaC50b3VjaGVzWzBdLmlkZW50aWZpZXIgJiYgdG91Y2hlc1sxXS5pZGVudGlmaWVyID09PSB0aGlzLl9pbml0aWFsUGluY2gudG91Y2hlc1sxXS5pZGVudGlmaWVyID8gZ2V0UGluY2hQcm9wcyh0b3VjaGVzKSAvLyB0aGUgdG91Y2hlcyBhcmUgaW4gdGhlIGNvcnJlY3Qgb3JkZXJcblx0XHQ6IHRvdWNoZXNbMV0uaWRlbnRpZmllciA9PT0gdGhpcy5faW5pdGlhbFBpbmNoLnRvdWNoZXNbMF0uaWRlbnRpZmllciAmJiB0b3VjaGVzWzBdLmlkZW50aWZpZXIgPT09IHRoaXMuX2luaXRpYWxQaW5jaC50b3VjaGVzWzFdLmlkZW50aWZpZXIgPyBnZXRQaW5jaFByb3BzKHRvdWNoZXMucmV2ZXJzZSgpKSAvLyB0aGUgdG91Y2hlcyBoYXZlIHNvbWVob3cgY2hhbmdlZCBvcmRlclxuXHRcdDogZ2V0UGluY2hQcm9wcyh0b3VjaGVzKTsgLy8gc29tZXRoaW5nIGlzIHdyb25nLCBidXQgd2Ugc3RpbGwgaGF2ZSB0d28gdG91Y2gtcG9pbnRzLCBzbyB3ZSB0cnkgbm90IHRvIGZhaWxcblxuXHRcdGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnQgPSB7XG5cdFx0XHR4OiBjdXJyZW50UGluY2guY2VudGVyLnggLSB0aGlzLl9pbml0aWFsUGluY2guY2VudGVyLngsXG5cdFx0XHR5OiBjdXJyZW50UGluY2guY2VudGVyLnkgLSB0aGlzLl9pbml0aWFsUGluY2guY2VudGVyLnlcblx0XHR9O1xuXG5cdFx0Y3VycmVudFBpbmNoLnRpbWUgPSBEYXRlLm5vdygpO1xuXHRcdHZhciB0aW1lU2luY2VMYXN0UGluY2ggPSBjdXJyZW50UGluY2gudGltZSAtIHRoaXMuX2xhc3RQaW5jaC50aW1lO1xuXG5cdFx0Y3VycmVudFBpbmNoLmRpc3BsYWNlbWVudFZlbG9jaXR5ID0ge1xuXHRcdFx0eDogKGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnQueCAtIHRoaXMuX2xhc3RQaW5jaC5kaXNwbGFjZW1lbnQueCkgLyB0aW1lU2luY2VMYXN0UGluY2gsXG5cdFx0XHR5OiAoY3VycmVudFBpbmNoLmRpc3BsYWNlbWVudC55IC0gdGhpcy5fbGFzdFBpbmNoLmRpc3BsYWNlbWVudC55KSAvIHRpbWVTaW5jZUxhc3RQaW5jaFxuXHRcdH07XG5cblx0XHRjdXJyZW50UGluY2gucm90YXRpb24gPSBjdXJyZW50UGluY2guYW5nbGUgLSB0aGlzLl9pbml0aWFsUGluY2guYW5nbGU7XG5cdFx0Y3VycmVudFBpbmNoLnJvdGF0aW9uVmVsb2NpdHkgPSBjdXJyZW50UGluY2gucm90YXRpb24gLSB0aGlzLl9sYXN0UGluY2gucm90YXRpb24gLyB0aW1lU2luY2VMYXN0UGluY2g7XG5cblx0XHRjdXJyZW50UGluY2guem9vbSA9IGN1cnJlbnRQaW5jaC5kaXN0YW5jZSAvIHRoaXMuX2luaXRpYWxQaW5jaC5kaXN0YW5jZTtcblx0XHRjdXJyZW50UGluY2guem9vbVZlbG9jaXR5ID0gKGN1cnJlbnRQaW5jaC56b29tIC0gdGhpcy5fbGFzdFBpbmNoLnpvb20pIC8gdGltZVNpbmNlTGFzdFBpbmNoO1xuXG5cdFx0dGhpcy5wcm9wcy5vblBpbmNoTW92ZSAmJiB0aGlzLnByb3BzLm9uUGluY2hNb3ZlKGN1cnJlbnRQaW5jaCwgZXZlbnQpO1xuXG5cdFx0dGhpcy5fbGFzdFBpbmNoID0gY3VycmVudFBpbmNoO1xuXHR9LFxuXG5cdG9uUGluY2hFbmQ6IGZ1bmN0aW9uIG9uUGluY2hFbmQoZXZlbnQpIHtcblx0XHQvLyBUT0RPIHVzZSBoZWxwZXIgdG8gb3JkZXIgdG91Y2hlcyBieSBpZGVudGlmaWVyIGFuZCB1c2UgYWN0dWFsIHZhbHVlcyBvbiB0b3VjaEVuZC5cblx0XHR2YXIgY3VycmVudFBpbmNoID0gX2V4dGVuZHMoe30sIHRoaXMuX2xhc3RQaW5jaCk7XG5cdFx0Y3VycmVudFBpbmNoLnRpbWUgPSBEYXRlLm5vdygpO1xuXG5cdFx0aWYgKGN1cnJlbnRQaW5jaC50aW1lIC0gdGhpcy5fbGFzdFBpbmNoLnRpbWUgPiAxNikge1xuXHRcdFx0Y3VycmVudFBpbmNoLmRpc3BsYWNlbWVudFZlbG9jaXR5ID0gMDtcblx0XHRcdGN1cnJlbnRQaW5jaC5yb3RhdGlvblZlbG9jaXR5ID0gMDtcblx0XHRcdGN1cnJlbnRQaW5jaC56b29tVmVsb2NpdHkgPSAwO1xuXHRcdH1cblxuXHRcdHRoaXMucHJvcHMub25QaW5jaEVuZCAmJiB0aGlzLnByb3BzLm9uUGluY2hFbmQoY3VycmVudFBpbmNoLCBldmVudCk7XG5cblx0XHR0aGlzLl9pbml0aWFsUGluY2ggPSB0aGlzLl9sYXN0UGluY2ggPSBudWxsO1xuXG5cdFx0Ly8gSWYgb25lIGZpbmdlciBpcyBzdGlsbCBvbiBzY3JlZW4sIGl0IHNob3VsZCBzdGFydCBhIG5ldyB0b3VjaCBldmVudCBmb3Igc3dpcGluZyBldGNcblx0XHQvLyBCdXQgaXQgc2hvdWxkIG5ldmVyIGZpcmUgYW4gb25UYXAgb3Igb25QcmVzcyBldmVudC5cblx0XHQvLyBTaW5jZSB0aGVyZSBpcyBubyBzdXBwb3J0IHN3aXBlcyB5ZXQsIHRoaXMgc2hvdWxkIGJlIGRpc3JlZ2FyZGVkIGZvciBub3dcblx0XHQvLyBpZiAoZXZlbnQudG91Y2hlcy5sZW5ndGggPT09IDEpIHtcblx0XHQvLyBcdHRoaXMub25Ub3VjaFN0YXJ0KGV2ZW50KTtcblx0XHQvLyB9XG5cdH0sXG5cblx0aW5pdFNjcm9sbERldGVjdGlvbjogZnVuY3Rpb24gaW5pdFNjcm9sbERldGVjdGlvbigpIHtcblx0XHR0aGlzLl9zY3JvbGxQb3MgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuXHRcdHRoaXMuX3Njcm9sbFBhcmVudHMgPSBbXTtcblx0XHR0aGlzLl9zY3JvbGxQYXJlbnRQb3MgPSBbXTtcblx0XHR2YXIgbm9kZSA9IHRoaXMuZ2V0RE9NTm9kZSgpO1xuXHRcdHdoaWxlIChub2RlKSB7XG5cdFx0XHRpZiAobm9kZS5zY3JvbGxIZWlnaHQgPiBub2RlLm9mZnNldEhlaWdodCB8fCBub2RlLnNjcm9sbFdpZHRoID4gbm9kZS5vZmZzZXRXaWR0aCkge1xuXHRcdFx0XHR0aGlzLl9zY3JvbGxQYXJlbnRzLnB1c2gobm9kZSk7XG5cdFx0XHRcdHRoaXMuX3Njcm9sbFBhcmVudFBvcy5wdXNoKG5vZGUuc2Nyb2xsVG9wICsgbm9kZS5zY3JvbGxMZWZ0KTtcblx0XHRcdFx0dGhpcy5fc2Nyb2xsUG9zLnRvcCArPSBub2RlLnNjcm9sbFRvcDtcblx0XHRcdFx0dGhpcy5fc2Nyb2xsUG9zLmxlZnQgKz0gbm9kZS5zY3JvbGxMZWZ0O1xuXHRcdFx0fVxuXHRcdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcblx0XHR9XG5cdH0sXG5cblx0Y2FsY3VsYXRlTW92ZW1lbnQ6IGZ1bmN0aW9uIGNhbGN1bGF0ZU1vdmVtZW50KHRvdWNoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IE1hdGguYWJzKHRvdWNoLmNsaWVudFggLSB0aGlzLl9pbml0aWFsVG91Y2guY2xpZW50WCksXG5cdFx0XHR5OiBNYXRoLmFicyh0b3VjaC5jbGllbnRZIC0gdGhpcy5faW5pdGlhbFRvdWNoLmNsaWVudFkpXG5cdFx0fTtcblx0fSxcblxuXHRkZXRlY3RTY3JvbGw6IGZ1bmN0aW9uIGRldGVjdFNjcm9sbCgpIHtcblx0XHR2YXIgY3VycmVudFNjcm9sbFBvcyA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zY3JvbGxQYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50U2Nyb2xsUG9zLnRvcCArPSB0aGlzLl9zY3JvbGxQYXJlbnRzW2ldLnNjcm9sbFRvcDtcblx0XHRcdGN1cnJlbnRTY3JvbGxQb3MubGVmdCArPSB0aGlzLl9zY3JvbGxQYXJlbnRzW2ldLnNjcm9sbExlZnQ7XG5cdFx0fVxuXHRcdHJldHVybiAhKGN1cnJlbnRTY3JvbGxQb3MudG9wID09PSB0aGlzLl9zY3JvbGxQb3MudG9wICYmIGN1cnJlbnRTY3JvbGxQb3MubGVmdCA9PT0gdGhpcy5fc2Nyb2xsUG9zLmxlZnQpO1xuXHR9LFxuXG5cdGNsZWFudXBTY3JvbGxEZXRlY3Rpb246IGZ1bmN0aW9uIGNsZWFudXBTY3JvbGxEZXRlY3Rpb24oKSB7XG5cdFx0dGhpcy5fc2Nyb2xsUGFyZW50cyA9IHVuZGVmaW5lZDtcblx0XHR0aGlzLl9zY3JvbGxQb3MgPSB1bmRlZmluZWQ7XG5cdH0sXG5cblx0aW5pdFByZXNzRGV0ZWN0aW9uOiBmdW5jdGlvbiBpbml0UHJlc3NEZXRlY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLm9uUHJlc3MpIHJldHVybjtcblx0XHR0aGlzLl9wcmVzc1RpbWVvdXQgPSBzZXRUaW1lb3V0KChmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGlzLnByb3BzLm9uUHJlc3MoZXZlbnQpO1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9KS5iaW5kKHRoaXMpLCB0aGlzLnByb3BzLnByZXNzRGVsYXkpO1xuXHR9LFxuXG5cdGNhbmNlbFByZXNzRGV0ZWN0aW9uOiBmdW5jdGlvbiBjYW5jZWxQcmVzc0RldGVjdGlvbigpIHtcblx0XHRjbGVhclRpbWVvdXQodGhpcy5fcHJlc3NUaW1lb3V0KTtcblx0fSxcblxuXHRvblRvdWNoTW92ZTogZnVuY3Rpb24gb25Ub3VjaE1vdmUoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5faW5pdGlhbFRvdWNoKSB7XG5cdFx0XHR0aGlzLnByb2Nlc3NFdmVudChldmVudCk7XG5cblx0XHRcdGlmICh0aGlzLmRldGVjdFNjcm9sbCgpKSByZXR1cm4gdGhpcy5lbmRUb3VjaChldmVudCk7XG5cblx0XHRcdHRoaXMucHJvcHMub25Ub3VjaE1vdmUgJiYgdGhpcy5wcm9wcy5vblRvdWNoTW92ZShldmVudCk7XG5cdFx0XHR0aGlzLl9sYXN0VG91Y2ggPSBnZXRUb3VjaFByb3BzKGV2ZW50LnRvdWNoZXNbMF0pO1xuXHRcdFx0dmFyIG1vdmVtZW50ID0gdGhpcy5jYWxjdWxhdGVNb3ZlbWVudCh0aGlzLl9sYXN0VG91Y2gpO1xuXHRcdFx0aWYgKG1vdmVtZW50LnggPiB0aGlzLnByb3BzLnByZXNzTW92ZVRocmVzaG9sZCB8fCBtb3ZlbWVudC55ID4gdGhpcy5wcm9wcy5wcmVzc01vdmVUaHJlc2hvbGQpIHtcblx0XHRcdFx0dGhpcy5jYW5jZWxQcmVzc0RldGVjdGlvbigpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG1vdmVtZW50LnggPiB0aGlzLnByb3BzLm1vdmVUaHJlc2hvbGQgfHwgbW92ZW1lbnQueSA+IHRoaXMucHJvcHMubW92ZVRocmVzaG9sZCkge1xuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZS5pc0FjdGl2ZSkge1xuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0aXNBY3RpdmU6IGZhbHNlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5fYWN0aXZlVGltZW91dCkge1xuXHRcdFx0XHRcdHRoaXMuY2xlYXJBY3RpdmVUaW1lb3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICghdGhpcy5zdGF0ZS5pc0FjdGl2ZSAmJiAhdGhpcy5fYWN0aXZlVGltZW91dCkge1xuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0aXNBY3RpdmU6IHRydWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAodGhpcy5faW5pdGlhbFBpbmNoICYmIGV2ZW50LnRvdWNoZXMubGVuZ3RoID09PSAyKSB7XG5cdFx0XHR0aGlzLm9uUGluY2hNb3ZlKGV2ZW50KTtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXHR9LFxuXG5cdG9uVG91Y2hFbmQ6IGZ1bmN0aW9uIG9uVG91Y2hFbmQoZXZlbnQpIHtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdFx0dmFyIGFmdGVyRW5kVG91Y2g7XG5cdFx0XHR2YXIgbW92ZW1lbnQgPSB0aGlzLmNhbGN1bGF0ZU1vdmVtZW50KHRoaXMuX2xhc3RUb3VjaCk7XG5cdFx0XHRpZiAobW92ZW1lbnQueCA8PSB0aGlzLnByb3BzLm1vdmVUaHJlc2hvbGQgJiYgbW92ZW1lbnQueSA8PSB0aGlzLnByb3BzLm1vdmVUaHJlc2hvbGQgJiYgdGhpcy5wcm9wcy5vblRhcCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRhZnRlckVuZFRvdWNoID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBmaW5hbFBhcmVudFNjcm9sbFBvcyA9IF90aGlzLl9zY3JvbGxQYXJlbnRzLm1hcChmdW5jdGlvbiAobm9kZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5vZGUuc2Nyb2xsVG9wICsgbm9kZS5zY3JvbGxMZWZ0O1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHZhciBzdG9wcGVkTW9tZW50dW1TY3JvbGwgPSBfdGhpcy5fc2Nyb2xsUGFyZW50UG9zLnNvbWUoZnVuY3Rpb24gKGVuZCwgaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVuZCAhPT0gZmluYWxQYXJlbnRTY3JvbGxQb3NbaV07XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0aWYgKCFzdG9wcGVkTW9tZW50dW1TY3JvbGwpIHtcblx0XHRcdFx0XHRcdF90aGlzLnByb3BzLm9uVGFwKGV2ZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmVuZFRvdWNoKGV2ZW50LCBhZnRlckVuZFRvdWNoKTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuX2luaXRpYWxQaW5jaCAmJiBldmVudC50b3VjaGVzLmxlbmd0aCArIGV2ZW50LmNoYW5nZWRUb3VjaGVzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy5vblBpbmNoRW5kKGV2ZW50KTtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXHR9LFxuXG5cdGVuZFRvdWNoOiBmdW5jdGlvbiBlbmRUb3VjaChldmVudCwgY2FsbGJhY2spIHtcblx0XHR0aGlzLmNhbmNlbFByZXNzRGV0ZWN0aW9uKCk7XG5cdFx0dGhpcy5jbGVhckFjdGl2ZVRpbWVvdXQoKTtcblx0XHRpZiAoZXZlbnQgJiYgdGhpcy5wcm9wcy5vblRvdWNoRW5kKSB7XG5cdFx0XHR0aGlzLnByb3BzLm9uVG91Y2hFbmQoZXZlbnQpO1xuXHRcdH1cblx0XHR0aGlzLl9pbml0aWFsVG91Y2ggPSBudWxsO1xuXHRcdHRoaXMuX2xhc3RUb3VjaCA9IG51bGw7XG5cdFx0aWYgKHRoaXMuc3RhdGUuaXNBY3RpdmUpIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRpc0FjdGl2ZTogZmFsc2Vcblx0XHRcdH0sIGNhbGxiYWNrKTtcblx0XHR9IGVsc2UgaWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH1cblx0fSxcblxuXHRvbk1vdXNlRG93bjogZnVuY3Rpb24gb25Nb3VzZURvd24oZXZlbnQpIHtcblx0XHRpZiAod2luZG93Ll9ibG9ja01vdXNlRXZlbnRzKSB7XG5cdFx0XHR3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHRoaXMucHJvcHMub25Nb3VzZURvd24gJiYgdGhpcy5wcm9wcy5vbk1vdXNlRG93bihldmVudCkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdHRoaXMuaW5pdFByZXNzRGV0ZWN0aW9uKGV2ZW50LCB0aGlzLmVuZE1vdXNlRXZlbnQpO1xuXHRcdHRoaXMuX21vdXNlRG93biA9IHRydWU7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRpc0FjdGl2ZTogdHJ1ZVxuXHRcdH0pO1xuXHR9LFxuXG5cdG9uTW91c2VNb3ZlOiBmdW5jdGlvbiBvbk1vdXNlTW92ZShldmVudCkge1xuXHRcdGlmICh3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgfHwgIXRoaXMuX21vdXNlRG93bikgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR0aGlzLnByb3BzLm9uTW91c2VNb3ZlICYmIHRoaXMucHJvcHMub25Nb3VzZU1vdmUoZXZlbnQpO1xuXHR9LFxuXG5cdG9uTW91c2VVcDogZnVuY3Rpb24gb25Nb3VzZVVwKGV2ZW50KSB7XG5cdFx0aWYgKHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cyB8fCAhdGhpcy5fbW91c2VEb3duKSByZXR1cm47XG5cdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdHRoaXMucHJvcHMub25Nb3VzZVVwICYmIHRoaXMucHJvcHMub25Nb3VzZVVwKGV2ZW50KTtcblx0XHR0aGlzLnByb3BzLm9uVGFwICYmIHRoaXMucHJvcHMub25UYXAoZXZlbnQpO1xuXHRcdHRoaXMuZW5kTW91c2VFdmVudCgpO1xuXHR9LFxuXG5cdG9uTW91c2VPdXQ6IGZ1bmN0aW9uIG9uTW91c2VPdXQoZXZlbnQpIHtcblx0XHRpZiAod2luZG93Ll9ibG9ja01vdXNlRXZlbnRzIHx8ICF0aGlzLl9tb3VzZURvd24pIHJldHVybjtcblx0XHR0aGlzLnByb2Nlc3NFdmVudChldmVudCk7XG5cdFx0dGhpcy5wcm9wcy5vbk1vdXNlT3V0ICYmIHRoaXMucHJvcHMub25Nb3VzZU91dChldmVudCk7XG5cdFx0dGhpcy5lbmRNb3VzZUV2ZW50KCk7XG5cdH0sXG5cblx0ZW5kTW91c2VFdmVudDogZnVuY3Rpb24gZW5kTW91c2VFdmVudCgpIHtcblx0XHR0aGlzLmNhbmNlbFByZXNzRGV0ZWN0aW9uKCk7XG5cdFx0dGhpcy5fbW91c2VEb3duID0gZmFsc2U7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRpc0FjdGl2ZTogZmFsc2Vcblx0XHR9KTtcblx0fSxcblxuXHR0b3VjaFN0eWxlczogZnVuY3Rpb24gdG91Y2hTdHlsZXMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdFdlYmtpdFRhcEhpZ2hsaWdodENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRXZWJraXRUb3VjaENhbGxvdXQ6ICdub25lJyxcblx0XHRcdFdlYmtpdFVzZXJTZWxlY3Q6ICdub25lJyxcblx0XHRcdEtodG1sVXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0TW96VXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0bXNVc2VyU2VsZWN0OiAnbm9uZScsXG5cdFx0XHR1c2VyU2VsZWN0OiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH07XG5cdH0sXG5cblx0aGFuZGxlcnM6IGZ1bmN0aW9uIGhhbmRsZXJzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRvblRvdWNoU3RhcnQ6IHRoaXMub25Ub3VjaFN0YXJ0LFxuXHRcdFx0b25Ub3VjaE1vdmU6IHRoaXMub25Ub3VjaE1vdmUsXG5cdFx0XHRvblRvdWNoRW5kOiB0aGlzLm9uVG91Y2hFbmQsXG5cdFx0XHRvbk1vdXNlRG93bjogdGhpcy5vbk1vdXNlRG93bixcblx0XHRcdG9uTW91c2VVcDogdGhpcy5vbk1vdXNlVXAsXG5cdFx0XHRvbk1vdXNlTW92ZTogdGhpcy5vbk1vdXNlTW92ZSxcblx0XHRcdG9uTW91c2VPdXQ6IHRoaXMub25Nb3VzZU91dFxuXHRcdH07XG5cdH1cbn07XG5cbi8qKlxuICogVGFwcGFibGUgQ29tcG9uZW50XG4gKiA9PT09PT09PT09PT09PT09PT1cbiAqL1xuXG52YXIgQ29tcG9uZW50ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdGRpc3BsYXlOYW1lOiAnVGFwcGFibGUnLFxuXG5cdG1peGluczogW01peGluXSxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjb21wb25lbnQ6IFJlYWN0LlByb3BUeXBlcy5hbnksIC8vIGNvbXBvbmVudCB0byBjcmVhdGVcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsIC8vIG9wdGlvbmFsIGNsYXNzTmFtZVxuXHRcdGNsYXNzQmFzZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgLy8gYmFzZSBmb3IgZ2VuZXJhdGVkIGNsYXNzTmFtZXNcblx0XHRzdHlsZTogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCwgLy8gYWRkaXRpb25hbCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgY29tcG9uZW50XG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sIC8vIG9ubHkgYXBwbGllcyB0byBidXR0b25zXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvbXBvbmVudDogJ3NwYW4nLFxuXHRcdFx0Y2xhc3NCYXNlOiAnVGFwcGFibGUnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgcHJvcHMgPSB0aGlzLnByb3BzO1xuXHRcdHZhciBjbGFzc05hbWUgPSBwcm9wcy5jbGFzc0Jhc2UgKyAodGhpcy5zdGF0ZS5pc0FjdGl2ZSA/ICctYWN0aXZlJyA6ICctaW5hY3RpdmUnKTtcblxuXHRcdGlmIChwcm9wcy5jbGFzc05hbWUpIHtcblx0XHRcdGNsYXNzTmFtZSArPSAnICcgKyBwcm9wcy5jbGFzc05hbWU7XG5cdFx0fVxuXG5cdFx0dmFyIHN0eWxlID0ge307XG5cdFx0X2V4dGVuZHMoc3R5bGUsIHRoaXMudG91Y2hTdHlsZXMoKSwgcHJvcHMuc3R5bGUpO1xuXG5cdFx0dmFyIG5ld0NvbXBvbmVudFByb3BzID0gX2V4dGVuZHMoe30sIHByb3BzLCB7XG5cdFx0XHRzdHlsZTogc3R5bGUsXG5cdFx0XHRjbGFzc05hbWU6IGNsYXNzTmFtZSxcblx0XHRcdGRpc2FibGVkOiBwcm9wcy5kaXNhYmxlZCxcblx0XHRcdGhhbmRsZXJzOiB0aGlzLmhhbmRsZXJzXG5cdFx0fSwgdGhpcy5oYW5kbGVycygpKTtcblxuXHRcdGRlbGV0ZSBuZXdDb21wb25lbnRQcm9wcy5vblRhcDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25QcmVzcztcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25QaW5jaFN0YXJ0O1xuXHRcdGRlbGV0ZSBuZXdDb21wb25lbnRQcm9wcy5vblBpbmNoTW92ZTtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25QaW5jaEVuZDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMubW92ZVRocmVzaG9sZDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMucHJlc3NEZWxheTtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMucHJlc3NNb3ZlVGhyZXNob2xkO1xuXHRcdGRlbGV0ZSBuZXdDb21wb25lbnRQcm9wcy5wcmV2ZW50RGVmYXVsdDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMuc3RvcFByb3BhZ2F0aW9uO1xuXHRcdGRlbGV0ZSBuZXdDb21wb25lbnRQcm9wcy5jb21wb25lbnQ7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChwcm9wcy5jb21wb25lbnQsIG5ld0NvbXBvbmVudFByb3BzLCBwcm9wcy5jaGlsZHJlbik7XG5cdH1cbn0pO1xuXG5Db21wb25lbnQuTWl4aW4gPSBNaXhpbjtcbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gVGltZXJzICgpIHtcbiAgdmFyIGludGVydmFscyA9IFtdXG4gIHZhciB0aW1lb3V0cyA9IFtdXG5cbiAgcmV0dXJuIHtcbiAgICBjbGVhckludGVydmFsczogZnVuY3Rpb24gKCkge1xuICAgICAgaW50ZXJ2YWxzLmZvckVhY2goY2xlYXJJbnRlcnZhbClcbiAgICB9LFxuXG4gICAgY2xlYXJUaW1lb3V0czogZnVuY3Rpb24gKCkge1xuICAgICAgdGltZW91dHMuZm9yRWFjaChjbGVhclRpbWVvdXQpXG4gICAgfSxcblxuICAgIGNvbXBvbmVudFdpbGxNb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgaW50ZXJ2YWxzID0gW11cbiAgICAgIHRpbWVvdXRzID0gW11cbiAgICB9LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuY2xlYXJJbnRlcnZhbHMoKVxuICAgICAgdGhpcy5jbGVhclRpbWVvdXRzKClcbiAgICB9LFxuXG4gICAgY291bnREb3duOiBmdW5jdGlvbiAoY2FsbGJhY2ssIHRpbWVvdXQsIGludGVydmFsKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgIHZhciBzbGVlcCA9IE1hdGgubWluKHRpbWVvdXQsIGludGVydmFsKVxuXG4gICAgICB0aGlzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVtYWluaW5nID0gdGltZW91dCAtIHNsZWVwXG5cbiAgICAgICAgY2FsbGJhY2socmVtYWluaW5nKVxuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDApIHJldHVyblxuXG4gICAgICAgIHNlbGYuY291bnREb3duKGNhbGxiYWNrLCByZW1haW5pbmcsIGludGVydmFsKVxuICAgICAgfSwgc2xlZXApXG4gICAgfSxcblxuICAgIHNldEludGVydmFsOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGludGVydmFsKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgaW50ZXJ2YWxzLnB1c2goc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXNlbGYuaXNNb3VudGVkKCkpIHJldHVyblxuXG4gICAgICAgIGNhbGxiYWNrLmNhbGwoc2VsZilcbiAgICAgIH0sIGludGVydmFsKSlcbiAgICB9LFxuXG4gICAgc2V0VGltZW91dDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aW1lb3V0KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFzZWxmLmlzTW91bnRlZCgpKSByZXR1cm5cblxuICAgICAgICBjYWxsYmFjay5jYWxsKHNlbGYpXG4gICAgICB9LCB0aW1lb3V0KSlcbiAgICB9XG4gIH1cbn1cbiIsInZhciBUb3VjaHN0b25lID0ge1xuXHRjcmVhdGVBcHA6IHJlcXVpcmUoJy4vbGliL2NyZWF0ZUFwcCcpLFxuXHROYXZpZ2F0aW9uOiByZXF1aXJlKCcuL2xpYi9taXhpbnMvTmF2aWdhdGlvbicpLFxuXHRMaW5rOiByZXF1aXJlKCcuL2xpYi9jb21wb25lbnRzL0xpbmsnKSxcblx0VUk6IHJlcXVpcmUoJy4vbGliL3VpJylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG91Y2hzdG9uZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIE5hdmlnYXRpb24gPSByZXF1aXJlKCcuLi9taXhpbnMvTmF2aWdhdGlvbicpO1xuXG52YXIgVFJBTlNJVElPTl9LRVlTID0gcmVxdWlyZSgnLi4vY29uc3RhbnRzL3RyYW5zaXRpb24ta2V5cycpO1xudmFyIHZhbGlkVHJhbnNpdGlvbnMgPSBPYmplY3Qua2V5cyhUUkFOU0lUSU9OX0tFWVMpO1xuXG4vKipcbiAqIFRvdWNoc3RvbmUgTGluayBDb21wb25lbnRcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRkaXNwbGF5TmFtZTogJ0xpbmsnLFxuXG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdHRvOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLmlzUmVxdWlyZWQsXG5cdFx0cGFyYW1zOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdHZpZXdUcmFuc2l0aW9uOiBSZWFjdC5Qcm9wVHlwZXMub25lT2YodmFsaWRUcmFuc2l0aW9ucyksXG5cdFx0Y29tcG9uZW50OiBSZWFjdC5Qcm9wVHlwZXMuYW55LFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2aWV3VHJhbnNpdGlvbjogJ25vbmUnLFxuXHRcdFx0Y29tcG9uZW50OiAnc3Bhbidcblx0XHR9O1xuXHR9LFxuXG5cdGFjdGlvbjogZnVuY3Rpb24gYWN0aW9uKCkge1xuXHRcdHZhciBwYXJhbXMgPSB0aGlzLnByb3BzLnBhcmFtcztcblxuXHRcdGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgcGFyYW1zKSB7XG5cdFx0XHRwYXJhbXMgPSBwYXJhbXMuY2FsbCh0aGlzKTtcblx0XHR9XG5cblx0XHR0aGlzLnNob3dWaWV3KHRoaXMucHJvcHMudG8sIHRoaXMucHJvcHMudmlld1RyYW5zaXRpb24sIHBhcmFtcyk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUYXBwYWJsZSxcblx0XHRcdHsgb25UYXA6IHRoaXMuYWN0aW9uLCBjbGFzc05hbWU6IHRoaXMucHJvcHMuY2xhc3NOYW1lLCBjb21wb25lbnQ6IHRoaXMucHJvcHMuY29tcG9uZW50IH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxuXG59KTsiLCIvKipcbiAqIFZpZXcgdHJhbnNpdGlvbiBhbmltYXRpb25zXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnbm9uZSc6IHsgaW46IGZhbHNlLCBvdXQ6IGZhbHNlIH0sXG5cdCdmYWRlJzogeyBpbjogdHJ1ZSwgb3V0OiB0cnVlIH0sXG5cdCdmYWRlLWNvbnRyYWN0JzogeyBpbjogdHJ1ZSwgb3V0OiB0cnVlIH0sXG5cdCdmYWRlLWV4cGFuZCc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQnc2hvdy1mcm9tLWxlZnQnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3Nob3ctZnJvbS1yaWdodCc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQnc2hvdy1mcm9tLXRvcCc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQnc2hvdy1mcm9tLWJvdHRvbSc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQncmV2ZWFsLWZyb20tbGVmdCc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQncmV2ZWFsLWZyb20tcmlnaHQnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3JldmVhbC1mcm9tLXRvcCc6IHsgaW46IGZhbHNlLCBvdXQ6IHRydWUgfSxcblx0J3JldmVhbC1mcm9tLWJvdHRvbSc6IHsgaW46IGZhbHNlLCBvdXQ6IHRydWUgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kL211dGFibGUnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFVJID0gcmVxdWlyZSgnLi91aScpO1xuXG52YXIgREVGQVVMVF9UUkFOU0lUSU9OID0gJ25vbmUnO1xudmFyIFRSQU5TSVRJT05TID0gcmVxdWlyZSgnLi9jb25zdGFudHMvdHJhbnNpdGlvbi1rZXlzJyk7XG5cbi8qKlxuICogVG91Y2hzdG9uZSBBcHBcbiAqID09PT09PT09PT09PT09XG4gKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgY2FsbGVkIHdpdGggeW91ciBhcHAncyB2aWV3cy5cbiAqXG4gKiBJdCByZXR1cm5zIGEgTWl4aW4gd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIHlvdXIgQXBwLlxuICovXG5mdW5jdGlvbiBjcmVhdGVBcHAodmlld3MpIHtcblx0cmV0dXJuIHtcblx0XHRjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcblx0XHRcdHRoaXMudmlld3MgPSB7fTtcblxuXHRcdFx0Zm9yICh2YXIgdmlld05hbWUgaW4gdmlld3MpIHtcblx0XHRcdFx0dmFyIHZpZXcgPSB2aWV3c1t2aWV3TmFtZV07XG5cdFx0XHRcdHRoaXMudmlld3Nbdmlld05hbWVdID0gUmVhY3QuY3JlYXRlRmFjdG9yeSh2aWV3KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Y2hpbGRDb250ZXh0VHlwZXM6IHtcblx0XHRcdGN1cnJlbnRWaWV3OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdFx0YXBwOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcblx0XHR9LFxuXG5cdFx0Z2V0Q2hpbGRDb250ZXh0OiBmdW5jdGlvbiBnZXRDaGlsZENvbnRleHQoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjdXJyZW50VmlldzogdGhpcy5zdGF0ZS5jdXJyZW50Vmlldyxcblx0XHRcdFx0YXBwOiB0aGlzXG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRnZXRDdXJyZW50VmlldzogZnVuY3Rpb24gZ2V0Q3VycmVudFZpZXcoKSB7XG5cdFx0XHR2YXIgdmlld3NEYXRhID0ge307XG5cdFx0XHR2aWV3c0RhdGFbdGhpcy5zdGF0ZS5jdXJyZW50Vmlld10gPSB0aGlzLmdldFZpZXcodGhpcy5zdGF0ZS5jdXJyZW50Vmlldyk7XG5cdFx0XHR2YXIgdmlld3MgPSBSZWFjdC5hZGRvbnMuY3JlYXRlRnJhZ21lbnQodmlld3NEYXRhKTtcblx0XHRcdHJldHVybiB2aWV3cztcblx0XHR9LFxuXG5cdFx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR2aWV3VHJhbnNpdGlvbjogdGhpcy5nZXRWaWV3VHJhbnNpdGlvbihERUZBVUxUX1RSQU5TSVRJT04pXG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRnZXRWaWV3OiBmdW5jdGlvbiBnZXRWaWV3KGtleSkge1xuXHRcdFx0dmFyIHZpZXcgPSB2aWV3c1trZXldO1xuXHRcdFx0aWYgKCF2aWV3KSByZXR1cm4gdGhpcy5nZXRWaWV3Tm90Rm91bmQoKTtcblxuXHRcdFx0dmFyIGdpdmVuUHJvcHMgPSB0aGlzLnN0YXRlW2tleSArICdfcHJvcHMnXTtcblx0XHRcdHZhciBwcm9wcyA9IHh0ZW5kKHtcblx0XHRcdFx0a2V5OiBrZXksXG5cdFx0XHRcdGFwcDogdGhpcyxcblx0XHRcdFx0dmlld0NsYXNzTmFtZTogdGhpcy5zdGF0ZVtrZXkgKyAnX2NsYXNzJ10gfHwgJ3ZpZXcnXG5cdFx0XHR9LCBnaXZlblByb3BzKTtcblxuXHRcdFx0aWYgKHRoaXMuZ2V0Vmlld1Byb3BzKSB7XG5cdFx0XHRcdHh0ZW5kKHByb3BzLCB0aGlzLmdldFZpZXdQcm9wcygpKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQodmlldywgcHJvcHMpO1xuXHRcdH0sXG5cblx0XHRnZXRWaWV3Tm90Rm91bmQ6IGZ1bmN0aW9uIGdldFZpZXdOb3RGb3VuZCgpIHtcblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRVSS5WaWV3LFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ3ZpZXcnIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0VUkuVmlld0NvbnRlbnQsXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFVJLkZlZWRiYWNrLCB7XG5cdFx0XHRcdFx0XHRpY29uS2V5OiAnaW9uLWFsZXJ0LWNpcmNsZWQnLFxuXHRcdFx0XHRcdFx0aWNvblR5cGU6ICdkYW5nZXInLFxuXHRcdFx0XHRcdFx0dGV4dDogJ1NvcnJ5LCB0aGUgdmlldyA8c3Ryb25nPlwiJyArIHRoaXMuc3RhdGUuY3VycmVudFZpZXcgKyAnXCI8L3N0cm9uZz4gaXMgbm90IGF2YWlsYWJsZS4nLFxuXHRcdFx0XHRcdFx0YWN0aW9uVGV4dDogJ09rYXksIHRha2UgbWUgaG9tZScsXG5cdFx0XHRcdFx0XHRhY3Rpb25GbjogdGhpcy5nb3RvRGVmYXVsdFZpZXdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpXG5cdFx0XHQpO1xuXHRcdH0sXG5cblx0XHRnZXRWaWV3VHJhbnNpdGlvbjogZnVuY3Rpb24gZ2V0Vmlld1RyYW5zaXRpb24oa2V5KSB7XG5cdFx0XHRpZiAoIVRSQU5TSVRJT05TW2tleV0pIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ludmFsaWQgVmlldyBUcmFuc2l0aW9uOiAnICsga2V5KTtcblx0XHRcdFx0a2V5ID0gJ25vbmUnO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4geHRlbmQoe1xuXHRcdFx0XHRrZXk6IGtleSxcblx0XHRcdFx0bmFtZTogJ3ZpZXctdHJhbnNpdGlvbi0nICsga2V5LFxuXHRcdFx0XHQnaW4nOiBmYWxzZSxcblx0XHRcdFx0b3V0OiBmYWxzZVxuXHRcdFx0fSwgVFJBTlNJVElPTlNba2V5XSk7XG5cdFx0fSxcblxuXHRcdHNob3dWaWV3OiBmdW5jdGlvbiBzaG93VmlldyhrZXksIHRyYW5zaXRpb24sIHByb3BzLCBzdGF0ZSkge1xuXHRcdFx0aWYgKHR5cGVvZiB0cmFuc2l0aW9uID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRwcm9wcyA9IHRyYW5zaXRpb247XG5cdFx0XHRcdHRyYW5zaXRpb24gPSBERUZBVUxUX1RSQU5TSVRJT047XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2YgdHJhbnNpdGlvbiAhPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0dHJhbnNpdGlvbiA9IERFRkFVTFRfVFJBTlNJVElPTjtcblx0XHRcdH1cblxuXHRcdFx0Y29uc29sZS5sb2coJ1Nob3dpbmcgdmlldyB8JyArIGtleSArICd8IHdpdGggdHJhbnNpdGlvbiB8JyArIHRyYW5zaXRpb24gKyAnfCBhbmQgcHJvcHMgJyArIEpTT04uc3RyaW5naWZ5KHByb3BzKSk7XG5cblx0XHRcdHZhciBuZXdTdGF0ZSA9IHtcblx0XHRcdFx0Y3VycmVudFZpZXc6IGtleSxcblx0XHRcdFx0cHJldmlvdXNWaWV3OiB0aGlzLnN0YXRlLmN1cnJlbnRWaWV3LFxuXHRcdFx0XHR2aWV3VHJhbnNpdGlvbjogdGhpcy5nZXRWaWV3VHJhbnNpdGlvbih0cmFuc2l0aW9uKVxuXHRcdFx0fTtcblxuXHRcdFx0bmV3U3RhdGVba2V5ICsgJ19jbGFzcyddID0gJ3ZpZXcnO1xuXHRcdFx0bmV3U3RhdGVba2V5ICsgJ19wcm9wcyddID0gcHJvcHMgfHwge307XG5cblx0XHRcdHh0ZW5kKG5ld1N0YXRlLCBzdGF0ZSk7XG5cblx0XHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUpO1xuXHRcdH1cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVBcHA7IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJ1dGYtOFwiPz4nICsgJzwhRE9DVFlQRSBzdmcgUFVCTElDIFwiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU5cIiBcImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZFwiPicgKyAnPHN2ZyB2ZXJzaW9uPVwiMS4xXCIgaWQ9XCJMYXllcl8xXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHg9XCIwcHhcIiB5PVwiMHB4XCInICsgJ1xcdCB2aWV3Qm94PVwiLTI0MiAxODMuNCA5MCA2NS40XCIgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgLTI0MiAxODMuNCA5MCA2NS40XCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj4nICsgJzxwYXRoIGNsYXNzPVwic3ZnLXBhdGhcIiBkPVwiTS0xNjYsMTgzLjRILTIwNWMtMy44LDAtNy40LDEuNS0xMC4xLDQuMmwtMjUuNiwyNS42Yy0xLjYsMS42LTEuNiw0LjIsMCw1LjhsMjUuNiwyNS42YzIuNywyLjcsNi4zLDQuMiwxMC4xLDQuMmgzOS4xJyArICdcXHRjNy45LDAsMTQtNi40LDE0LTE0LjN2LTM2LjhDLTE1MiwxODkuOC0xNTguMSwxODMuNC0xNjYsMTgzLjQgTS0xNjkuOCwyMjguNGwtNC4zLDQuM2wtMTIuMy0xMi4zbC0xMi4zLDEyLjNsLTQuMy00LjNsMTIuMy0xMi4zJyArICdcXHRsLTEyLjMtMTIuM2w0LjMtNC4zbDEyLjMsMTIuM2wxMi4zLTEyLjNsNC4zLDQuM2wtMTIuMywxMi4zTC0xNjkuOCwyMjguNHpcIi8+JyArICc8L3N2Zz4nOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbi8qKlxuICogVG91Y2hzdG9uZSBOYXZpZ2F0aW9uIE1peGluXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHRkaXNwbGF5TmFtZTogJ05hdmlnYXRpb24nLFxuXG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGN1cnJlbnRWaWV3OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkXG5cdH0sXG5cblx0c2hvd1ZpZXc6IGZ1bmN0aW9uIHNob3dWaWV3KCkge1xuXHRcdHRoaXMuY29udGV4dC5hcHAuc2hvd1ZpZXcuYXBwbHkodGhpcy5jb250ZXh0LmFwcCwgYXJndW1lbnRzKTtcblx0fSxcblxuXHRzaG93Vmlld0ZuOiBmdW5jdGlvbiBzaG93Vmlld0ZuKCkge1xuXHRcdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiAoZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5jb250ZXh0LmFwcC5zaG93Vmlldy5hcHBseSh0aGlzLmNvbnRleHQuYXBwLCBhcmdzKTtcblx0XHR9KS5iaW5kKHRoaXMpO1xuXHR9XG5cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIE5hdmlnYXRpb24gPSByZXF1aXJlKCcuLi9taXhpbnMvTmF2aWdhdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdBY3Rpb25CdXR0b24nLFxuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y29tcG9uZW50OiAnYnV0dG9uJyxcblx0XHRcdGRpc2FibGVkOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMuaWNvbiwge1xuXHRcdFx0J2FjdGlvbi1idXR0b24nOiB0cnVlLFxuXHRcdFx0J2Rpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIGxhYmVsID0gdGhpcy5wcm9wcy5sYWJlbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnYWN0aW9uLWJ1dHRvbi1sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgY3VyYXRlZCA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCB7XG5cdFx0XHRjaGlsZHJlbjogdHJ1ZSxcblx0XHRcdGNsYXNzTmFtZTogdHJ1ZSxcblx0XHRcdGRpc2FibGVkOiB0cnVlLFxuXHRcdFx0aWNvbjogdHJ1ZSxcblx0XHRcdGxhYmVsOiB0cnVlLFxuXHRcdFx0c2hvd1ZpZXc6IHRydWUsXG5cdFx0XHR2aWV3UHJvcHM6IHRydWUsXG5cdFx0XHR2aWV3VHJhbnNpdGlvbjogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0Ly8gVE9ETzogcmVtb3ZlIHRoaXMgYmVoYXZpb3VyIGluID4wLjIuMFxuXHRcdGlmICghY3VyYXRlZC5vblRhcCAmJiB0aGlzLnByb3BzLnNob3dWaWV3KSB7XG5cdFx0XHRjdXJhdGVkLm9uVGFwID0gdGhpcy5zaG93Vmlld0ZuKHRoaXMucHJvcHMuc2hvd1ZpZXcsIHRoaXMucHJvcHMudmlld1RyYW5zaXRpb24sIHRoaXMucHJvcHMudmlld1Byb3BzKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdhY3Rpb24tYnV0dG9uLWNlbGwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRUYXBwYWJsZSxcblx0XHRcdFx0X2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBjdXJhdGVkKSxcblx0XHRcdFx0bGFiZWwsXG5cdFx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdBY3Rpb25CdXR0b25zJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGFzc05hbWU6ICcnXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IHRoaXMucHJvcHMuY2xhc3NOYW1lID8gdGhpcy5wcm9wcy5jbGFzc05hbWUgKyAnIGFjdGlvbi1idXR0b25zJyA6ICdhY3Rpb24tYnV0dG9ucyc7XG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgVmlld0NvbnRlbnQgPSByZXF1aXJlKCcuL1ZpZXdDb250ZW50Jyk7XG5cbnZhciBhbGVydFR5cGVzID0gWydkZWZhdWx0JywgJ3ByaW1hcnknLCAnc3VjY2VzcycsICd3YXJuaW5nJywgJ2RhbmdlciddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdBbGVydGJhcicsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWlnaHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cHVsc2U6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5vbmVPZihhbGVydFR5cGVzKVxuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVpZ2h0OiAnMzBweCcsXG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnQWxlcnRiYXInOiB0cnVlLFxuXHRcdFx0J3B1bHNlJzogdGhpcy5wcm9wcy5wdWxzZVxuXHRcdH0pO1xuXHRcdHZhciBjb250ZW50ID0gdGhpcy5wcm9wcy5wdWxzZSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnQWxlcnRiYXItaW5uZXInIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KSA6IHRoaXMucHJvcHMuY2hpbGRyZW47XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFZpZXdDb250ZW50LFxuXHRcdFx0eyBoZWlnaHQ6IHRoaXMucHJvcHMuaGVpZ2h0LCBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0Y29udGVudFxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyksXG4gICAgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdleHBvcnRzJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvbktleTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uVHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWFkZXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c3ViaGVhZGVyOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHRleHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0YWN0aW9uVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRhY3Rpb25GbjogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsYXNzTmFtZTogJydcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gdGhpcy5wcm9wcy5jbGFzc05hbWUgPyAndmlldy1mZWVkYmFjayAnICsgdGhpcy5wcm9wcy5jbGFzc05hbWUgOiAndmlldy1mZWVkYmFjayc7XG5cblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbktleSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAndmlldy1mZWVkYmFjay1pY29uICcgKyB0aGlzLnByb3BzLmljb25LZXkgKyAnICcgKyB0aGlzLnByb3BzLmljb25UeXBlIH0pIDogbnVsbDtcblx0XHR2YXIgaGVhZGVyID0gdGhpcy5wcm9wcy5oZWFkZXIgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ3ZpZXctZmVlZGJhY2staGVhZGVyJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5oZWFkZXJcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgc3ViaGVhZGVyID0gdGhpcy5wcm9wcy5zdWJoZWFkZXIgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ3ZpZXctZmVlZGJhY2stc3ViaGVhZGVyJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5zdWJoZWFkZXJcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgdGV4dCA9IHRoaXMucHJvcHMudGV4dCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAndmlldy1mZWVkYmFjay10ZXh0JywgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHsgX19odG1sOiB0aGlzLnByb3BzLnRleHQgfSB9KSA6IG51bGw7XG5cdFx0dmFyIGFjdGlvbiA9IHRoaXMucHJvcHMuYWN0aW9uVGV4dCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUYXBwYWJsZSxcblx0XHRcdHsgb25UYXA6IHRoaXMucHJvcHMuYWN0aW9uRm4sIGNsYXNzTmFtZTogJ3ZpZXctZmVlZGJhY2stYWN0aW9uJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5hY3Rpb25UZXh0XG5cdFx0KSA6IG51bGw7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0aWNvbixcblx0XHRcdGhlYWRlcixcblx0XHRcdHN1YmhlYWRlcixcblx0XHRcdHRleHQsXG5cdFx0XHRhY3Rpb25cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG4gICAgVmlld0NvbnRlbnQgPSByZXF1aXJlKCcuL1ZpZXdDb250ZW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0Zvb3RlcmJhcicsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWlnaHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVpZ2h0OiAnNDRweCdcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnRm9vdGVyYmFyJzogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRWaWV3Q29udGVudCxcblx0XHRcdHsgaGVpZ2h0OiB0aGlzLnByb3BzLmhlaWdodCwgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG4gICAgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuICAgIE5hdmlnYXRpb24gPSByZXF1aXJlKCcuLi9taXhpbnMvTmF2aWdhdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cdGRpc3BsYXlOYW1lOiAnQWN0aW9uQnV0dG9uJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGNvbXBvbmVudDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzaG93VmlldzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aWV3VHJhbnNpdGlvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aWV3UHJvcHM6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdG9uVGFwOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0XHRhY3RpdmU6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvbXBvbmVudDogJ2RpdicsXG5cdFx0XHRkaXNhYmxlZDogZmFsc2UsXG5cdFx0XHRhY3RpdmU6IGZhbHNlXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMuaWNvbiwge1xuXHRcdFx0J0Zvb3RlcmJhci1idXR0b24nOiB0cnVlLFxuXHRcdFx0J2FjdGl2ZSc6IHRoaXMucHJvcHMuYWN0aXZlLFxuXHRcdFx0J2Rpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIGxhYmVsID0gdGhpcy5wcm9wcy5sYWJlbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnRm9vdGVyYmFyLWJ1dHRvbi1sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgYWN0aW9uID0gdGhpcy5wcm9wcy5zaG93VmlldyA/IHRoaXMuc2hvd1ZpZXdGbih0aGlzLnByb3BzLnNob3dWaWV3LCB0aGlzLnByb3BzLnZpZXdUcmFuc2l0aW9uLCB0aGlzLnByb3BzLnZpZXdQcm9wcykgOiB0aGlzLnByb3BzLm9uVGFwO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUYXBwYWJsZSxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUsIGNvbXBvbmVudDogdGhpcy5wcm9wcy5jb21wb25lbnQsIG9uVGFwOiBhY3Rpb24gfSxcblx0XHRcdGxhYmVsLFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdIZWFkZXJiYXInLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWlnaHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Zml4ZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnSGVhZGVyYmFyJywgdGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMudHlwZSwgeyAnZml4ZWQnOiB0aGlzLnByb3BzLmZpeGVkIH0pO1xuXG5cdFx0dmFyIGxhYmVsO1xuXHRcdGlmICh0aGlzLnByb3BzLmxhYmVsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxhYmVsID0gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnSGVhZGVyYmFyLWxhYmVsJyB9LFxuXHRcdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGhlaWdodDogdGhpcy5wcm9wcy5oZWlnaHQsIGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuLFxuXHRcdFx0bGFiZWxcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG4gICAgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuICAgIE5hdmlnYXRpb24gPSByZXF1aXJlKCcuLi9taXhpbnMvTmF2aWdhdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdIZWFkZXJiYXJCdXR0b24nLFxuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGNvbXBvbmVudDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzaG93VmlldzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aWV3VHJhbnNpdGlvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aWV3UHJvcHM6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHZpc2libGU6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHByaW1hcnk6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdG9uVGFwOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0XHRwb3NpdGlvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2aXNpYmxlOiB0cnVlLFxuXHRcdFx0ZGlzYWJsZWQ6IGZhbHNlXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMucG9zaXRpb24sIHRoaXMucHJvcHMuaWNvbiwge1xuXHRcdFx0J0hlYWRlcmJhci1idXR0b24nOiB0cnVlLFxuXHRcdFx0J2hpZGRlbic6ICF0aGlzLnByb3BzLnZpc2libGUsXG5cdFx0XHQnZGlzYWJsZWQnOiB0aGlzLnByb3BzLmRpc2FibGVkLFxuXHRcdFx0J2lzLXByaW1hcnknOiB0aGlzLnByb3BzLnByaW1hcnlcblx0XHR9KTtcblxuXHRcdHZhciBsYWJlbCA9IHRoaXMucHJvcHMubGFiZWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ2FjdGlvbi1idXR0b24tbGFiZWwnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIGFjdGlvbiA9IHRoaXMucHJvcHMuc2hvd1ZpZXcgPyB0aGlzLnNob3dWaWV3Rm4odGhpcy5wcm9wcy5zaG93VmlldywgdGhpcy5wcm9wcy52aWV3VHJhbnNpdGlvbiwgdGhpcy5wcm9wcy52aWV3UHJvcHMpIDogdGhpcy5wcm9wcy5vblRhcDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiBhY3Rpb24sIGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6IHRoaXMucHJvcHMuY29tcG9uZW50IH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsLFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJbnB1dCcsXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6ICd0ZXh0J1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGRpc2FibGVkID0gdGhpcy5wcm9wcy5kaXNhYmxlZCB8fCB0aGlzLnByb3BzLnJlYWRvbmx5O1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCAnZmllbGQtaXRlbSBsaXN0LWl0ZW0nLCB7XG5cdFx0XHQnaXMtZmlyc3QnOiB0aGlzLnByb3BzLmZpcnN0LFxuXHRcdFx0J3Utc2VsZWN0YWJsZSc6IGRpc2FibGVkXG5cdFx0fSk7XG5cblx0XHR2YXIgY3VyYXRlZCA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCB7XG5cdFx0XHRjbGFzc05hbWU6IHRydWUsXG5cdFx0XHRkaXNhYmxlZDogdHJ1ZSxcblx0XHRcdGZpcnN0OiB0cnVlLFxuXHRcdFx0cmVhZG9ubHk6IHRydWUsXG5cdFx0XHRjaGlsZHJlbjogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0taW5uZXInIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2xhYmVsJyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0tY29udGVudCcgfSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdpbnB1dCcsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiAnZmllbGQnLCBkaXNhYmxlZDogZGlzYWJsZWQgfSwgY3VyYXRlZCkpXG5cdFx0XHRcdCksXG5cdFx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1NZWRpYScsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGF2YXRhcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0aHVtYm5haWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh7XG5cdFx0XHQnaXRlbS1tZWRpYSc6IHRydWUsXG5cdFx0XHQnaXMtaWNvbic6IHRoaXMucHJvcHMuaWNvbixcblx0XHRcdCdpcy1hdmF0YXInOiB0aGlzLnByb3BzLmF2YXRhciB8fCB0aGlzLnByb3BzLmF2YXRhckluaXRpYWxzLFxuXHRcdFx0J2lzLXRodW1ibmFpbCc6IHRoaXMucHJvcHMudGh1bWJuYWlsXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0Ly8gbWVkaWEgdHlwZXNcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnaXRlbS1pY29uICcgKyB0aGlzLnByb3BzLmljb24gfSkgOiBudWxsO1xuXHRcdHZhciBhdmF0YXIgPSB0aGlzLnByb3BzLmF2YXRhciB8fCB0aGlzLnByb3BzLmF2YXRhckluaXRpYWxzID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWF2YXRhcicgfSxcblx0XHRcdHRoaXMucHJvcHMuYXZhdGFyID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnaW1nJywgeyBzcmM6IHRoaXMucHJvcHMuYXZhdGFyIH0pIDogdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFsc1xuXHRcdCkgOiBudWxsO1xuXHRcdHZhciB0aHVtYm5haWwgPSB0aGlzLnByb3BzLnRodW1ibmFpbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS10aHVtYm5haWwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdpbWcnLCB7IHNyYzogdGhpcy5wcm9wcy50aHVtYm5haWwgfSlcblx0XHQpIDogbnVsbDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRpY29uLFxuXHRcdFx0YXZhdGFyLFxuXHRcdFx0dGh1bWJuYWlsXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtTm90ZScsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh7XG5cdFx0XHQnaXRlbS1ub3RlJzogdHJ1ZVxuXHRcdH0sIHRoaXMucHJvcHMudHlwZSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0Ly8gZWxlbWVudHNcblx0XHR2YXIgbGFiZWwgPSB0aGlzLnByb3BzLmxhYmVsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLW5vdGUtbGFiZWwnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIGljb24gPSB0aGlzLnByb3BzLmljb24gPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ2l0ZW0tbm90ZS1pY29uICcgKyB0aGlzLnByb3BzLmljb24gfSkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdGxhYmVsLFxuXHRcdFx0aWNvblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgaWNvbnMgPSB7XG5cdGRlbDogcmVxdWlyZSgnLi4vaWNvbnMvZGVsZXRlJylcbn07XG5cbnZhciBWaWV3Q29udGVudCA9IHJlcXVpcmUoJy4vVmlld0NvbnRlbnQnKTtcbnZhciBLZXlwYWRCdXR0b24gPSByZXF1aXJlKCcuL0tleXBhZEJ1dHRvbicpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0tleXBhZCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGFjdGlvbjogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHN0b3dlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0ZW5hYmxlRGVsOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAvLyBvcHRpb25zOiAnYmxhY2stdHJhbnNsdWNlbnQnLCAnd2hpdGUtdHJhbnNsdWNlbnQnXG5cdFx0d2lsZGtleTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBhY3Rpb24gPSB0aGlzLnByb3BzLmFjdGlvbjtcblx0XHR2YXIgdHlwZU5hbWUgPSAnS2V5cGFkLS0nICsgdGhpcy5wcm9wcy50eXBlO1xuXHRcdHZhciBrZXlwYWRDbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0eXBlTmFtZSwgJ0tleXBhZCcsIHtcblx0XHRcdCdpcy1zdG93ZWQnOiB0aGlzLnByb3BzLnN0b3dlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIHdpbGRrZXk7XG5cblx0XHRpZiAodGhpcy5wcm9wcy53aWxka2V5ID09PSAnZGVjaW1hbCcpIHtcblx0XHRcdHdpbGRrZXkgPSBSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyB2YWx1ZTogJ2RlY2ltYWwnLCBwcmltYXJ5TGFiZWw6ICfCtycsIGF1eDogdHJ1ZSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0d2lsZGtleSA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkQnV0dG9uLCB7IGF1eDogdHJ1ZSwgZGlzYWJsZWQ6IHRydWUgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRWaWV3Q29udGVudCxcblx0XHRcdHsgY2xhc3NOYW1lOiBrZXlwYWRDbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkQnV0dG9uLCB7IGFjdGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBhY3Rpb24oJzEnKTtcblx0XHRcdFx0fSwgcHJpbWFyeUxhYmVsOiAnMScgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCcyJyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzInLCBzZWNvbmRhcnlMYWJlbDogJ0FCQycgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCczJyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzMnLCBzZWNvbmRhcnlMYWJlbDogJ0RFRicgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCc0Jyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzQnLCBzZWNvbmRhcnlMYWJlbDogJ0dISScgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCc1Jyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzUnLCBzZWNvbmRhcnlMYWJlbDogJ0pLTCcgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCc2Jyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzYnLCBzZWNvbmRhcnlMYWJlbDogJ01OTycgfSksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCc3Jyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzcnLCBzZWNvbmRhcnlMYWJlbDogJ1BRUlMnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignOCcpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc4Jywgc2Vjb25kYXJ5TGFiZWw6ICdUVVYnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignOScpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc5Jywgc2Vjb25kYXJ5TGFiZWw6ICdXWFlaJyB9KSxcblx0XHRcdHdpbGRrZXksXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCcwJyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzAnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignZGVsZXRlJyk7XG5cdFx0XHRcdH0sIGljb246IGljb25zLmRlbCwgZGlzYWJsZWQ6ICF0aGlzLnByb3BzLmVuYWJsZURlbCwgYXV4OiB0cnVlIH0pXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdLZXlwYWRCdXR0b24nLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRhY3Rpb246IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdGF1eDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdkZWxldGUnOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRkaXNhYmxlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0cHJpbWFyeUxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHNlY29uZGFyeUxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFjdGlvbjogZnVuY3Rpb24gYWN0aW9uKCkge30sXG5cdFx0XHRjbGFzc05hbWU6ICcnLFxuXHRcdFx0c2Vjb25kYXJ5TGFiZWw6ICcnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnS2V5cGFkLWJ1dHRvbicsIHtcblx0XHRcdCdpcy1hdXhpbGlhcnknOiB0aGlzLnByb3BzLmF1eCB8fCB0aGlzLnByb3BzWydkZWxldGUnXSxcblx0XHRcdCdkaXNhYmxlZCc6IHRoaXMucHJvcHMuZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciBwcmltYXJ5TGFiZWwgPSB0aGlzLnByb3BzLnByaW1hcnlMYWJlbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnS2V5cGFkLWJ1dHRvbi1wcmltYXJ5LWxhYmVsJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5wcmltYXJ5TGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgc2Vjb25kYXJ5TGFiZWwgPSB0aGlzLnByb3BzLnNlY29uZGFyeUxhYmVsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdLZXlwYWQtYnV0dG9uLXNlY29uZGFyeS1sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMuc2Vjb25kYXJ5TGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nLCB7IGNsYXNzTmFtZTogJ0tleXBhZC1idXR0b24taWNvbicsIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7IF9faHRtbDogdGhpcy5wcm9wcy5pY29uIH0gfSkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnS2V5cGFkLWNlbGwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRUYXBwYWJsZSxcblx0XHRcdFx0eyBvblRhcDogdGhpcy5wcm9wcy5hY3Rpb24sIGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6ICdkaXYnIH0sXG5cdFx0XHRcdGljb24sXG5cdFx0XHRcdHByaW1hcnlMYWJlbCxcblx0XHRcdFx0c2Vjb25kYXJ5TGFiZWxcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0xhYmVsSW5wdXQnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cGF0dGVybjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRwbGFjZWhvbGRlcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRyZWY6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0YWxpZ25Ub3A6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHJlYWRvbmx5OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRkaXNhYmxlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0Zmlyc3Q6IFJlYWN0LlByb3BUeXBlcy5ib29sXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAndGV4dCcsXG5cdFx0XHRyZWFkb25seTogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwge1xuXHRcdFx0J2xpc3QtaXRlbSc6IHRydWUsXG5cdFx0XHQnZmllbGQtaXRlbSc6IHRydWUsXG5cdFx0XHQnaXMtZmlyc3QnOiB0aGlzLnByb3BzLmZpcnN0LFxuXHRcdFx0J2FsaWduLXRvcCc6IHRoaXMucHJvcHMuYWxpZ25Ub3AsXG5cdFx0XHQndS1zZWxlY3RhYmxlJzogdGhpcy5wcm9wcy5kaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIHJlbmRlcklucHV0ID0gdGhpcy5wcm9wcy5yZWFkb25seSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQgdS1zZWxlY3RhYmxlJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy52YWx1ZVxuXHRcdCkgOiBSZWFjdC5jcmVhdGVFbGVtZW50KCdpbnB1dCcsIHsgZGlzYWJsZWQ6IHRoaXMucHJvcHMuZGlzYWJsZWQsIHR5cGU6IHRoaXMucHJvcHMudHlwZSwgcGF0dGVybjogdGhpcy5wcm9wcy5wYXR0ZXJuLCByZWY6IHRoaXMucHJvcHMucmVmLCB2YWx1ZTogdGhpcy5wcm9wcy52YWx1ZSwgZGVmYXVsdFZhbHVlOiB0aGlzLnByb3BzLmRlZmF1bHRWYWx1ZSwgb25DaGFuZ2U6IHRoaXMucHJvcHMub25DaGFuZ2UsIGNsYXNzTmFtZTogJ2ZpZWxkJywgcGxhY2Vob2xkZXI6IHRoaXMucHJvcHMucGxhY2Vob2xkZXIgfSk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdsYWJlbCcsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWlubmVyJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQtbGFiZWwnIH0sXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdFx0XHQpLFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQtY29udHJvbCcgfSxcblx0XHRcdFx0XHRyZW5kZXJJbnB1dCxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0xhYmVsU2VsZWN0Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGZpcnN0OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2xhc3NOYW1lOiAnJ1xuXHRcdH07XG5cdH0sXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2YWx1ZTogdGhpcy5wcm9wcy52YWx1ZVxuXHRcdH07XG5cdH0sXG5cdHVwZGF0ZUlucHV0VmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUlucHV0VmFsdWUoZXZlbnQpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHZhbHVlOiBldmVudC50YXJnZXQudmFsdWVcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0Ly8gU2V0IENsYXNzZXNcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwge1xuXHRcdFx0J2xpc3QtaXRlbSc6IHRydWUsXG5cdFx0XHQnaXMtZmlyc3QnOiB0aGlzLnByb3BzLmZpcnN0XG5cdFx0fSk7XG5cblx0XHQvLyBNYXAgT3B0aW9uc1xuXHRcdHZhciBvcHRpb25zID0gdGhpcy5wcm9wcy5vcHRpb25zLm1hcCgoZnVuY3Rpb24gKG9wKSB7XG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J29wdGlvbicsXG5cdFx0XHRcdHsga2V5OiAnb3B0aW9uLScgKyBvcC52YWx1ZSwgdmFsdWU6IG9wLnZhbHVlIH0sXG5cdFx0XHRcdG9wLmxhYmVsXG5cdFx0XHQpO1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnbGFiZWwnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWxhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWNvbnRyb2wnIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdzZWxlY3QnLFxuXHRcdFx0XHRcdFx0eyB2YWx1ZTogdGhpcy5zdGF0ZS52YWx1ZSwgb25DaGFuZ2U6IHRoaXMudXBkYXRlSW5wdXRWYWx1ZSwgY2xhc3NOYW1lOiAnc2VsZWN0LWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdzZWxlY3QtZmllbGQtaW5kaWNhdG9yJyB9LFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdzZWxlY3QtZmllbGQtaW5kaWNhdG9yLWFycm93JyB9KVxuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbFRleHRhcmVhJyxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvd3M6IDNcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgZGlzYWJsZWQgPSB0aGlzLnByb3BzLmRpc2FibGVkIHx8IHRoaXMucHJvcHMucmVhZG9ubHk7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHtcblx0XHRcdCdsaXN0LWl0ZW0nOiB0cnVlLFxuXHRcdFx0J2ZpZWxkLWl0ZW0nOiB0cnVlLFxuXHRcdFx0J2FsaWduLXRvcCc6IHRydWUsXG5cdFx0XHQnaXMtZmlyc3QnOiB0aGlzLnByb3BzLmZpcnN0LFxuXHRcdFx0J3Utc2VsZWN0YWJsZSc6IGRpc2FibGVkXG5cdFx0fSk7XG5cblx0XHR2YXIgY3VyYXRlZCA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCB7XG5cdFx0XHRjbGFzc05hbWU6IHRydWUsXG5cdFx0XHRkaXNhYmxlZDogdHJ1ZSxcblx0XHRcdGZpcnN0OiB0cnVlLFxuXHRcdFx0cmVhZG9ubHk6IHRydWUsXG5cdFx0XHRjaGlsZHJlbjogdHJ1ZSxcblx0XHRcdGxhYmVsOiB0cnVlXG5cdFx0fSk7XG5cblx0XHR2YXIgcmVuZGVySW5wdXQgPSB0aGlzLnByb3BzLnJlYWRvbmx5ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZCB1LXNlbGVjdGFibGUnIH0sXG5cdFx0XHR0aGlzLnByb3BzLnZhbHVlXG5cdFx0KSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJywgX2V4dGVuZHMoeyBkaXNhYmxlZDogZGlzYWJsZWQgfSwgY3VyYXRlZCwgeyBjbGFzc05hbWU6ICdmaWVsZCcgfSkpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdsYWJlbCcsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWxhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWNvbnRyb2wnIH0sXG5cdFx0XHRcdFx0cmVuZGVySW5wdXQsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuICAgIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcbiAgICBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi4vbWl4aW5zL05hdmlnYXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTG9hZGluZ0J1dHRvbicsXG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2hvd1ZpZXc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1RyYW5zaXRpb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1Byb3BzOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdGNvbXBvbmVudDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvblRhcDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRkaXNhYmxlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bG9hZGluZzogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRpc2FibGVkOiBmYWxzZSxcblx0XHRcdGxvYWRpbmc6IGZhbHNlXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0Ly8gQ2xhc3MgTmFtZVxuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0aGlzLnByb3BzLnR5cGUsIHtcblx0XHRcdCdsb2FkaW5nLWJ1dHRvbic6IHRydWUsXG5cdFx0XHQnZGlzYWJsZWQnOiB0aGlzLnByb3BzLmRpc2FibGVkLFxuXHRcdFx0J2lzLWxvYWRpbmcnOiB0aGlzLnByb3BzLmxvYWRpbmdcblx0XHR9KTtcblxuXHRcdC8vIFNldCBWYXJpYWJsZXNcblx0XHR2YXIgbGFiZWwgPSB0aGlzLnByb3BzLmxhYmVsICYmICF0aGlzLnByb3BzLmxvYWRpbmcgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ2xvYWRpbmctYnV0dG9uLXRleHQnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIG9uVGFwID0gdGhpcy5wcm9wcy5zaG93VmlldyA/IHRoaXMuc2hvd1ZpZXdGbih0aGlzLnByb3BzLnNob3dWaWV3LCB0aGlzLnByb3BzLnZpZXdUcmFuc2l0aW9uLCB0aGlzLnByb3BzLnZpZXdQcm9wcykgOiB0aGlzLnByb3BzLm9uVGFwO1xuXHRcdHZhciBsb2FkaW5nRWxlbWVudHMgPSB0aGlzLnByb3BzLmxvYWRpbmcgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J3NwYW4nLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdsb2FkaW5nLWJ1dHRvbi1pY29uLXdyYXBwZXInIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6ICdsb2FkaW5nLWJ1dHRvbi1pY29uJyB9KVxuXHRcdCkgOiBudWxsO1xuXG5cdFx0Ly8gT3V0cHV0IENvbXBvbmVudFxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6IHRoaXMucHJvcHMuY29tcG9uZW50LCBvblRhcDogb25UYXAgfSxcblx0XHRcdGxvYWRpbmdFbGVtZW50cyxcblx0XHRcdGxhYmVsLFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTW9kYWwnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2hvd01vZGFsOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRsb2FkaW5nOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRtaW5pOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRpY29uS2V5OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb25UeXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGhlYWRlcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0ZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHByaW1hcnlBY3Rpb25UZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHByaW1hcnlBY3Rpb25GbjogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0c2Vjb25kYXJ5QWN0aW9uVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzZWNvbmRhcnlBY3Rpb25GbjogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2hvd01vZGFsOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNob3dNb2RhbDogdGhpcy5wcm9wcy5zaG93TW9kYWxcblx0XHR9O1xuXHR9LFxuXG5cdC8vIFRPRE86IHVzZSBSZWFjdFRyYW5zaXRpb25Hcm91cCB0byBoYW5kbGUgZmFkZSBpbi9vdXRcblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCFzZWxmLmlzTW91bnRlZCgpKSByZXR1cm47XG5cblx0XHRcdHNlbGYuc2V0U3RhdGUoeyBzaG93TW9kYWw6IHRydWUgfSk7XG5cdFx0fSwgMSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0Ly8gU2V0IGNsYXNzbmFtZXNcblx0XHR2YXIgZGlhbG9nQ2xhc3NOYW1lID0gY2xhc3NuYW1lcyh7XG5cdFx0XHQnTW9kYWwtZGlhbG9nJzogdHJ1ZSxcblx0XHRcdCdNb2RhbC1taW5pJzogdGhpcy5wcm9wcy5taW5pLFxuXHRcdFx0J01vZGFsLWxvYWRpbmcnOiB0aGlzLnByb3BzLmxvYWRpbmdcblx0XHR9LCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIG1vZGFsQ2xhc3NOYW1lID0gY2xhc3NuYW1lcygnTW9kYWwnLCB7XG5cdFx0XHQnZW50ZXInOiB0aGlzLnN0YXRlLnNob3dNb2RhbFxuXHRcdH0pO1xuXG5cdFx0Ly8gU2V0IGR5bmFtaWMgY29udGVudFxuXHRcdHZhciBpY29uID0gdGhpcy5wcm9wcy5pY29uS2V5ID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdNb2RhbC1pY29uICcgKyB0aGlzLnByb3BzLmljb25LZXkgKyAnICcgKyB0aGlzLnByb3BzLmljb25UeXBlIH0pIDogbnVsbDtcblx0XHR2YXIgaGVhZGVyID0gdGhpcy5wcm9wcy5oZWFkZXIgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ01vZGFsLWhlYWRlcicgfSxcblx0XHRcdHRoaXMucHJvcHMuaGVhZGVyXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIHRleHQgPSB0aGlzLnByb3BzLnRleHQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ01vZGFsLXRleHQnLCBkYW5nZXJvdXNseVNldElubmVySFRNTDogeyBfX2h0bWw6IHRoaXMucHJvcHMudGV4dCB9IH0pIDogbnVsbDtcblx0XHR2YXIgcHJpbWFyeUFjdGlvbiA9IHRoaXMucHJvcHMucHJpbWFyeUFjdGlvblRleHQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnByb3BzLnByaW1hcnlBY3Rpb25GbiwgY2xhc3NOYW1lOiAnTW9kYWwtYWN0aW9uIE1vZGFsLWFjdGlvbi1wcmltYXJ5JyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5wcmltYXJ5QWN0aW9uVGV4dFxuXHRcdCkgOiBudWxsO1xuXHRcdHZhciBzZWNvbmRhcnlBY3Rpb24gPSB0aGlzLnByb3BzLnNlY29uZGFyeUFjdGlvblRleHQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnByb3BzLnNlY29uZGFyeUFjdGlvbkZuLCBjbGFzc05hbWU6ICdNb2RhbC1hY3Rpb24gTW9kYWwtYWN0aW9uLXNlY29uZGFyeScgfSxcblx0XHRcdHRoaXMucHJvcHMuc2Vjb25kYXJ5QWN0aW9uVGV4dFxuXHRcdCkgOiBudWxsO1xuXG5cdFx0dmFyIGFjdGlvbnMgPSBwcmltYXJ5QWN0aW9uID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdNb2RhbC1hY3Rpb25zJyB9LFxuXHRcdFx0c2Vjb25kYXJ5QWN0aW9uLFxuXHRcdFx0cHJpbWFyeUFjdGlvblxuXHRcdCkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBtb2RhbENsYXNzTmFtZSB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiBkaWFsb2dDbGFzc05hbWUgfSxcblx0XHRcdFx0aWNvbixcblx0XHRcdFx0aGVhZGVyLFxuXHRcdFx0XHR0ZXh0LFxuXHRcdFx0XHRhY3Rpb25zXG5cdFx0XHQpLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdNb2RhbC1iYWNrZHJvcCcgfSlcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG4gICAgS2V5cGFkID0gcmVxdWlyZSgnLi9LZXlwYWQnKSxcbiAgICBWaWV3Q29udGVudCA9IHJlcXVpcmUoJy4vVmlld0NvbnRlbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnUGFzc2NvZGUnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRhY3Rpb246IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRrZXlib2FyZElzU3Rvd2VkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGhlbHBUZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsYXNzTmFtZTogJycsXG5cdFx0XHRoZWxwVGV4dDogJ0VudGVyIHlvdXIgcGFzc2NvZGUnLFxuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVscFRleHQ6IHRoaXMucHJvcHMuaGVscFRleHQsXG5cdFx0XHRrZXlib2FyZElzU3Rvd2VkOiB0cnVlLFxuXHRcdFx0cGFzc2NvZGU6ICcnXG5cdFx0fTtcblx0fSxcblxuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0Ly8gc2xpZGUgdGhlIGtleWJvYXJkIHVwIGFmdGVyIHRoZSB2aWV3IGlzIHNob3duXG5cdFx0c2V0VGltZW91dCgoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCF0aGlzLmlzTW91bnRlZCgpKSByZXR1cm47XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0a2V5Ym9hcmRJc1N0b3dlZDogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdH0pLmJpbmQodGhpcyksIDQwMCk7XG5cdH0sXG5cblx0aGFuZGxlUGFzc2NvZGU6IGZ1bmN0aW9uIGhhbmRsZVBhc3Njb2RlKGtleUNvZGUpIHtcblxuXHRcdHZhciBwYXNzY29kZSA9IHRoaXMuc3RhdGUucGFzc2NvZGU7XG5cblx0XHRpZiAoa2V5Q29kZSA9PT0gJ2RlbGV0ZScpIHtcblx0XHRcdHBhc3Njb2RlID0gcGFzc2NvZGUuc2xpY2UoMCwgLTEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXNzY29kZSA9IHBhc3Njb2RlLmNvbmNhdChrZXlDb2RlKTtcblx0XHR9XG5cblx0XHRpZiAocGFzc2NvZGUubGVuZ3RoICE9PSA0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdHBhc3Njb2RlOiBwYXNzY29kZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0c2V0VGltZW91dCgoZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvcHMuYWN0aW9uKHBhc3Njb2RlKTtcblx0XHR9KS5iaW5kKHRoaXMpLCAyMDApOyAvLyB0aGUgdHJhbnNpdGlvbiB0aGF0IHN0b3dzIHRoZSBrZXlib2FyZCB0YWtlcyAxNTBtcywgaXQgZnJlZXplcyBpZiBpbnRlcnJ1cHRlZCBieSB0aGUgUmVhY3RDU1NUcmFuc2l0aW9uR3JvdXBcblxuXHRcdHJldHVybiB0aGlzLnNldFN0YXRlKHtcblx0XHRcdHBhc3Njb2RlOiBwYXNzY29kZVxuXHRcdH0pO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXG5cdFx0dmFyIHBhc3Njb2RlQ2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLnR5cGUsIHtcblx0XHRcdCdQYXNzY29kZSc6IHRydWVcblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0Vmlld0NvbnRlbnQsXG5cdFx0XHR7IGdyb3c6IHRydWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogcGFzc2NvZGVDbGFzc05hbWUgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWxhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMuaGVscFRleHRcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWZpZWxkcycgfSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdQYXNzY29kZS1pbnB1dCAnICsgKHRoaXMuc3RhdGUucGFzc2NvZGUubGVuZ3RoID4gMCA/ICdoYXMtdmFsdWUnIDogJycpIH0pXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdQYXNzY29kZS1pbnB1dCAnICsgKHRoaXMuc3RhdGUucGFzc2NvZGUubGVuZ3RoID4gMSA/ICdoYXMtdmFsdWUnIDogJycpIH0pXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdQYXNzY29kZS1pbnB1dCAnICsgKHRoaXMuc3RhdGUucGFzc2NvZGUubGVuZ3RoID4gMiA/ICdoYXMtdmFsdWUnIDogJycpIH0pXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ1Bhc3Njb2RlLWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdQYXNzY29kZS1pbnB1dCAnICsgKHRoaXMuc3RhdGUucGFzc2NvZGUubGVuZ3RoID4gMyA/ICdoYXMtdmFsdWUnIDogJycpIH0pXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpXG5cdFx0XHQpLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWQsIHsgdHlwZTogdGhpcy5wcm9wcy50eXBlLCBhY3Rpb246IHRoaXMuaGFuZGxlUGFzc2NvZGUsIGVuYWJsZURlbDogQm9vbGVhbih0aGlzLnN0YXRlLnBhc3Njb2RlLmxlbmd0aCksIHN0b3dlZDogdGhpcy5zdGF0ZS5rZXlib2FyZElzU3Rvd2VkIH0pXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0ZGlzcGxheU5hbWU6ICdSYWRpb0xpc3QnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdG9wdGlvbnM6IFJlYWN0LlByb3BUeXBlcy5hcnJheSxcblx0XHR2YWx1ZTogUmVhY3QuUHJvcFR5cGVzLm9uZU9mVHlwZShbUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgUmVhY3QuUHJvcFR5cGVzLm51bWJlcl0pLFxuXHRcdGljb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jXG5cdH0sXG5cblx0b25DaGFuZ2U6IGZ1bmN0aW9uIG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0dGhpcy5wcm9wcy5vbkNoYW5nZSh2YWx1ZSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cblx0XHR2YXIgb3B0aW9ucyA9IHRoaXMucHJvcHMub3B0aW9ucy5tYXAoKGZ1bmN0aW9uIChvcCwgaSkge1xuXHRcdFx0dmFyIGNsYXNzTmFtZSA9ICdsaXN0LWl0ZW0nICsgKGkgPT09IDAgPyAnIGlzLWZpcnN0JyA6ICcnKTtcblx0XHRcdHZhciBjaGVja01hcmsgPSBvcC52YWx1ZSA9PT0gdGhpcy5wcm9wcy52YWx1ZSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0tbm90ZSBwcmltYXJ5JyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ2l0ZW0tbm90ZS1pY29uIGlvbi1jaGVja21hcmsnIH0pXG5cdFx0XHQpIDogbnVsbDtcblxuXHRcdFx0dmFyIGljb24gPSBvcC5pY29uID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1tZWRpYScgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnc3BhbicsIHsgY2xhc3NOYW1lOiAnaXRlbS1pY29uIHByaW1hcnkgJyArIG9wLmljb24gfSlcblx0XHRcdCkgOiBudWxsO1xuXG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0VGFwcGFibGUsXG5cdFx0XHRcdHsga2V5OiAnb3B0aW9uLScgKyBpLCBvblRhcDogdGhpcy5vbkNoYW5nZS5iaW5kKHRoaXMsIG9wLnZhbHVlKSwgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdFx0aWNvbixcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0taW5uZXInIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLXRpdGxlJyB9LFxuXHRcdFx0XHRcdFx0b3AubGFiZWxcblx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdGNoZWNrTWFya1xuXHRcdFx0XHQpXG5cdFx0XHQpO1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdG51bGwsXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxuXG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnU3dpdGNoJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b246IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnc3dpdGNoJywgJ3N3aXRjaC0nICsgdGhpcy5wcm9wcy50eXBlLCB7ICdvbic6IHRoaXMucHJvcHMub24gfSk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0eyBvblRhcDogdGhpcy5wcm9wcy5vblRhcCwgY2xhc3NOYW1lOiBjbGFzc05hbWUsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAndHJhY2snIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnaGFuZGxlJyB9KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdUZXh0YXJlYScsXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvd3M6IDNcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBkaXNhYmxlZCA9IHRoaXMucHJvcHMuZGlzYWJsZWQgfHwgdGhpcy5wcm9wcy5yZWFkb25seTtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgJ2ZpZWxkLWl0ZW0gbGlzdC1pdGVtJywge1xuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdCxcblx0XHRcdCd1LXNlbGVjdGFibGUnOiBkaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIGN1cmF0ZWQgPSBibGFja2xpc3QodGhpcy5wcm9wcywge1xuXHRcdFx0Y2hpbGRyZW46IHRydWUsXG5cdFx0XHRjbGFzc05hbWU6IHRydWUsXG5cdFx0XHRkaXNhYmxlZDogdHJ1ZSxcblx0XHRcdGZpcnN0OiB0cnVlLFxuXHRcdFx0aW5wdXRSZWY6IHRydWUsXG5cdFx0XHRyZWFkb25seTogdHJ1ZVxuXHRcdH0pO1xuXHRcdGN1cmF0ZWQucmVmID0gdGhpcy5wcm9wcy5pbnB1dFJlZjtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWlubmVyJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdsYWJlbCcsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWNvbnRlbnQnIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogJ2ZpZWxkJywgZGlzYWJsZWQ6IGRpc2FibGVkIH0sIGN1cmF0ZWQpKVxuXHRcdFx0XHQpLFxuXHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdUb2dnbGUnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvbkNoYW5nZTogUmVhY3QuUHJvcFR5cGVzLmZ1bmMuaXNSZXF1aXJlZCxcblx0XHRvcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuYXJyYXkuaXNSZXF1aXJlZCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6ICdwcmltYXJ5J1xuXHRcdH07XG5cdH0sXG5cblx0b25DaGFuZ2U6IGZ1bmN0aW9uIG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0dGhpcy5wcm9wcy5vbkNoYW5nZSh2YWx1ZSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cblx0XHR2YXIgY29tcG9uZW50Q2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnVG9nZ2xlJzogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0dmFyIG9wdGlvbnMgPSB0aGlzLnByb3BzLm9wdGlvbnMubWFwKChmdW5jdGlvbiAob3ApIHtcblx0XHRcdHZhciBpdGVtQ2xhc3NOYW1lID0gY2xhc3NuYW1lcyh7XG5cdFx0XHRcdCdUb2dnbGUtaXRlbSc6IHRydWUsXG5cdFx0XHRcdCdhY3RpdmUnOiBvcC52YWx1ZSA9PT0gdGhpcy5wcm9wcy52YWx1ZVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0VGFwcGFibGUsXG5cdFx0XHRcdHsga2V5OiAnb3B0aW9uLScgKyBvcC52YWx1ZSwgb25UYXA6IHRoaXMub25DaGFuZ2UuYmluZCh0aGlzLCBvcC52YWx1ZSksIGNsYXNzTmFtZTogaXRlbUNsYXNzTmFtZSB9LFxuXHRcdFx0XHRvcC5sYWJlbFxuXHRcdFx0KTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY29tcG9uZW50Q2xhc3NOYW1lIH0sXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxuXG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdWaWV3JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2xhc3NOYW1lOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IHRoaXMucHJvcHMuY2xhc3NOYW1lID8gJ1ZpZXcgJyArIHRoaXMucHJvcHMuY2xhc3NOYW1lIDogJ1ZpZXcnO1xuXG5cdFx0Ly8gcmVhY3QgZG9lcyBub3QgY3VycmVudGx5IHN1cHBvcnQgZHVwbGljYXRlIHByb3BlcnRpZXMgKHdoaWNoIHdlIG5lZWQgZm9yIHZlbmRvci1wcmVmaXhlZCB2YWx1ZXMpXG5cdFx0Ly8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9pc3N1ZXMvMjAyMFxuXHRcdC8vIG1vdmVkIHRoZSBkaXNwbGF5IHByb3BlcnRpZXMgdG8gY3NzL3RvdWNoc3RvbmUvdmlldy5sZXNzIHVzaW5nIHRoZSBjbGFzcyBcIi5WaWV3XCJcblxuXHRcdC8vIHdoZW4gc3VwcG9ydGVkLCBhcHBseSB0aGUgZm9sbG93aW5nOlxuXHRcdC8vIGRpc3BsYXk6ICctd2Via2l0LWJveCcsXG5cdFx0Ly8gZGlzcGxheTogJy13ZWJraXQtZmxleCcsXG5cdFx0Ly8gZGlzcGxheTogJy1tb3otYm94Jyxcblx0XHQvLyBkaXNwbGF5OiAnLW1vei1mbGV4Jyxcblx0XHQvLyBkaXNwbGF5OiAnLW1zLWZsZXhib3gnLFxuXHRcdC8vIGRpc3BsYXk6ICdmbGV4JyxcblxuXHRcdHZhciBpbmxpbmVTdHlsZSA9IHtcblx0XHRcdFdlYmtpdEZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0TW96RmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRtc0ZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0RmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRXZWJraXRBbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHRNb3pBbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHRBbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHRXZWJraXRKdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nLFxuXHRcdFx0TW96SnVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1iZXR3ZWVuJyxcblx0XHRcdEp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2Vlbidcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUsIHN0eWxlOiBpbmxpbmVTdHlsZSB9LFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyksXG4gICAgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVmlld0NvbnRlbnQnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRpZDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGVpZ2h0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHNjcm9sbGFibGU6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGdyb3c6IFJlYWN0LlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsYXNzTmFtZTogJycsXG5cdFx0XHRoZWlnaHQ6ICcnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh7XG5cdFx0XHQnVmlld0NvbnRlbnQnOiB0cnVlLFxuXHRcdFx0J3NwcmluZ3ktc2Nyb2xsaW5nJzogdGhpcy5wcm9wcy5zY3JvbGxhYmxlXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0dmFyIGlubGluZVN0eWxlID0ge307XG5cblx0XHQvLyBzZXQgaGVpZ2h0IG9uIGJsb2NrcyBpZiBwcm92aWRlZFxuXHRcdGlmICh0aGlzLnByb3BzLmhlaWdodCkge1xuXHRcdFx0aW5saW5lU3R5bGUuaGVpZ2h0ID0gdGhpcy5wcm9wcy5oZWlnaHQ7XG5cdFx0fVxuXG5cdFx0Ly8gc3RyZXRjaCB0byB0YWtlIHVwIHNwYWNlXG5cdFx0aWYgKHRoaXMucHJvcHMuZ3Jvdykge1xuXHRcdFx0aW5saW5lU3R5bGUuV2Via2l0Qm94RmxleCA9ICcxJztcblx0XHRcdGlubGluZVN0eWxlLldlYmtpdEZsZXggPSAnMSc7XG5cdFx0XHRpbmxpbmVTdHlsZS5Nb3pCb3hGbGV4ID0gJzEnO1xuXHRcdFx0aW5saW5lU3R5bGUuTW96RmxleCA9ICcxJztcblx0XHRcdGlubGluZVN0eWxlLk1zRmxleCA9ICcxJztcblx0XHRcdGlubGluZVN0eWxlLmZsZXggPSAnMSc7XG5cdFx0fVxuXG5cdFx0Ly8gYWxsb3cgYmxvY2tzIHRvIGJlIHNjcm9sbGFibGVcblx0XHRpZiAodGhpcy5wcm9wcy5zY3JvbGxhYmxlKSB7XG5cdFx0XHRpbmxpbmVTdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG5cdFx0XHRpbmxpbmVTdHlsZS5XZWJraXRPdmVyZmxvd1Njcm9sbGluZyA9ICd0b3VjaCc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUsIGlkOiB0aGlzLnByb3BzLmlkLCBzdHlsZTogaW5saW5lU3R5bGUgfSxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRBY3Rpb25CdXR0b246IHJlcXVpcmUoJy4vQWN0aW9uQnV0dG9uJyksXG5cdEFjdGlvbkJ1dHRvbnM6IHJlcXVpcmUoJy4vQWN0aW9uQnV0dG9ucycpLFxuXHRBbGVydGJhcjogcmVxdWlyZSgnLi9BbGVydGJhcicpLFxuXHRGZWVkYmFjazogcmVxdWlyZSgnLi9GZWVkYmFjaycpLFxuXHRGb290ZXJiYXI6IHJlcXVpcmUoJy4vRm9vdGVyYmFyJyksXG5cdEZvb3RlcmJhckJ1dHRvbjogcmVxdWlyZSgnLi9Gb290ZXJiYXJCdXR0b24nKSxcblx0SGVhZGVyYmFyOiByZXF1aXJlKCcuL0hlYWRlcmJhcicpLFxuXHRIZWFkZXJiYXJCdXR0b246IHJlcXVpcmUoJy4vSGVhZGVyYmFyQnV0dG9uJyksXG5cdElucHV0OiByZXF1aXJlKCcuL0lucHV0JyksXG5cdEl0ZW1NZWRpYTogcmVxdWlyZSgnLi9JdGVtTWVkaWEnKSxcblx0SXRlbU5vdGU6IHJlcXVpcmUoJy4vSXRlbU5vdGUnKSxcblx0S2V5cGFkOiByZXF1aXJlKCcuL0tleXBhZCcpLFxuXHRMYWJlbElucHV0OiByZXF1aXJlKCcuL0xhYmVsSW5wdXQnKSxcblx0TGFiZWxTZWxlY3Q6IHJlcXVpcmUoJy4vTGFiZWxTZWxlY3QnKSxcblx0TGFiZWxUZXh0YXJlYTogcmVxdWlyZSgnLi9MYWJlbFRleHRhcmVhJyksXG5cdExvYWRpbmdCdXR0b246IHJlcXVpcmUoJy4vTG9hZGluZ0J1dHRvbicpLFxuXHRNb2RhbDogcmVxdWlyZSgnLi9Nb2RhbCcpLFxuXHRQYXNzY29kZTogcmVxdWlyZSgnLi9QYXNzY29kZScpLFxuXHRSYWRpb0xpc3Q6IHJlcXVpcmUoJy4vUmFkaW9MaXN0JyksXG5cdFN3aXRjaDogcmVxdWlyZSgnLi9Td2l0Y2gnKSxcblx0VGV4dGFyZWE6IHJlcXVpcmUoJy4vVGV4dGFyZWEnKSxcblx0VG9nZ2xlOiByZXF1aXJlKCcuL1RvZ2dsZScpLFxuXHRWaWV3OiByZXF1aXJlKCcuL1ZpZXcnKSxcblx0Vmlld0NvbnRlbnQ6IHJlcXVpcmUoJy4vVmlld0NvbnRlbnQnKVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJsYWNrbGlzdCAoc3JjKSB7XG4gIHZhciBjb3B5ID0ge30sIGZpbHRlciA9IGFyZ3VtZW50c1sxXVxuXG4gIGlmICh0eXBlb2YgZmlsdGVyID09PSAnc3RyaW5nJykge1xuICAgIGZpbHRlciA9IHt9XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZpbHRlclthcmd1bWVudHNbaV1dID0gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGtleSBpbiBzcmMpIHtcbiAgICAvLyBibGFja2xpc3Q/XG4gICAgaWYgKGZpbHRlcltrZXldKSBjb250aW51ZVxuXG4gICAgY29weVtrZXldID0gc3JjW2tleV1cbiAgfVxuXG4gIHJldHVybiBjb3B5XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQodGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7IG5hbWU6ICdEZWNlbWJlcicsICAgbnVtYmVyOiAnMTInLCAgc2Vhc29uOiAnU3VtbWVyJyB9LFxuXHR7IG5hbWU6ICdKYW51YXJ5JywgICAgbnVtYmVyOiAnMScsICAgc2Vhc29uOiAnU3VtbWVyJyB9LFxuXHR7IG5hbWU6ICdGZWJydWFyeScsICAgbnVtYmVyOiAnMicsICAgc2Vhc29uOiAnU3VtbWVyJyB9LFxuXHR7IG5hbWU6ICdNYXJjaCcsICAgICAgbnVtYmVyOiAnMycsICAgc2Vhc29uOiAnQXV0dW1uJyB9LFxuXHR7IG5hbWU6ICdBcHJpbCcsICAgICAgbnVtYmVyOiAnNCcsICAgc2Vhc29uOiAnQXV0dW1uJyB9LFxuXHR7IG5hbWU6ICdNYXknLCAgICAgICAgbnVtYmVyOiAnNScsICAgc2Vhc29uOiAnQXV0dW1uJyB9LFxuXHR7IG5hbWU6ICdKdW5lJywgICAgICAgbnVtYmVyOiAnNicsICAgc2Vhc29uOiAnV2ludGVyJyB9LFxuXHR7IG5hbWU6ICdKdWx5JywgICAgICAgbnVtYmVyOiAnNycsICAgc2Vhc29uOiAnV2ludGVyJyB9LFxuXHR7IG5hbWU6ICdBdWd1c3QnLCAgICAgbnVtYmVyOiAnOCcsICAgc2Vhc29uOiAnV2ludGVyJyB9LFxuXHR7IG5hbWU6ICdTZXB0ZW1iZXInLCAgbnVtYmVyOiAnOScsICAgc2Vhc29uOiAnU3ByaW5nJyB9LFxuXHR7IG5hbWU6ICdPY3RvYmVyJywgICAgbnVtYmVyOiAnMTAnLCAgc2Vhc29uOiAnU3ByaW5nJyB9LFxuXHR7IG5hbWU6ICdOb3ZlbWJlcicsICAgbnVtYmVyOiAnMTEnLCAgc2Vhc29uOiAnU3ByaW5nJyB9XG5dOyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7IG5hbWU6IHsgZmlyc3Q6ICdCZW5qYW1pbicsIGxhc3Q6ICdMdXB0b24nIH0sICAgIGpvaW5lZERhdGU6ICdNYXIgOCwgMjAwOScsICAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMC5naXRodWJ1c2VyY29udGVudC5jb20vdS82MTE0OD92PTMmcz00NjAnLCAgICBiaW86ICcnLCAgZmxhdm91cjogJ3ZhbmlsbGEnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnQm9yaXMnLCAgICBsYXN0OiAnQm96aWMnIH0sICAgICBqb2luZWREYXRlOiAnTWFyIDEyLCAyMDEzJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczEuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMzgzODcxNj92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdjaG9jb2xhdGUnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnQ2FybG9zJywgICBsYXN0OiAnQ29sb24nIH0sICAgICBqb2luZWREYXRlOiAnTm92IDcsIDIwMTMnLCAgIGxvY2F0aW9uOiAnTmV3IEhhbXBzaGlyZSwgVVNBJywgIGltZzogJ2h0dHBzOi8vYXZhdGFyczMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNTg3MjUxNT92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdjYXJhbWVsJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ0RhdmlkJywgICAgbGFzdDogJ0JhbmhhbScgfSwgICAgam9pbmVkRGF0ZTogJ0ZlYiAyMiwgMjAxMScsICBsb2NhdGlvbjogJ1N5ZG5leSwgQVUnLCAgICAgICAgICBpbWc6ICdodHRwczovL2F2YXRhcnMzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzYzMTgzMj92PTMmcz00NjAnLCAgIGJpbzogJycsICBmbGF2b3VyOiAnc3RyYXdiZXJyeSd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdGcmVkZXJpYycsIGxhc3Q6ICdCZWF1ZGV0JyB9LCAgIGpvaW5lZERhdGU6ICdNYXIgMTIsIDIwMTMnLCAgbG9jYXRpb246ICdNb250cmVhbCcsICAgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMC5naXRodWJ1c2VyY29udGVudC5jb20vdS8zODMzMzM1P3Y9MyZzPTQ2MCcsICBiaW86ICcnLCAgZmxhdm91cjogJ3N0cmF3YmVycnknfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnSmFtZXMnLCAgICBsYXN0OiAnQWxsZW4nIH0sICAgICBqb2luZWREYXRlOiAnRmViIDE0LCAyMDEzJywgIGxvY2F0aW9uOiAnTWFuY2hlc3RlcicsICAgICAgICAgIGltZzogJycsICBiaW86ICcnLCAgZmxhdm91cjogJ2JhbmFuYSd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdKZWQnLCAgICAgIGxhc3Q6ICdXYXRzb24nIH0sICAgIGpvaW5lZERhdGU6ICdKdW4gMjQsIDIwMTEnLCAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMS5naXRodWJ1c2VyY29udGVudC5jb20vdS84NzIzMTA/dj0zJnM9NDYwJywgICBiaW86ICcnLCAgZmxhdm91cjogJ2JhbmFuYSd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdKb3NzJywgICAgIGxhc3Q6ICdNYWNraXNvbicgfSwgIGpvaW5lZERhdGU6ICdOb3YgNiwgMjAxMicsICAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMi5naXRodWJ1c2VyY29udGVudC5jb20vdS8yNzMwODMzP3Y9MyZzPTQ2MCcsICBiaW86ICcnLCAgZmxhdm91cjogJ2xlbW9uJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ0pvaG5ueScsICAgbGFzdDogJ0VzdGlsbGVzJyB9LCAgam9pbmVkRGF0ZTogJ1NlcCAyMywgMjAxMycsICBsb2NhdGlvbjogJ1BoaWxpcHBpbmVzJywgICAgICAgICBpbWc6ICcnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdsZW1vbid9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdNYXJrdXMnLCAgIGxhc3Q6ICdQYWRvdXJlaycgfSwgIGpvaW5lZERhdGU6ICdPY3QgMTcsIDIwMTInLCAgbG9jYXRpb246ICdMb25kb24sIFVLJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMi5naXRodWJ1c2VyY29udGVudC5jb20vdS8yNTgwMjU0P3Y9MyZzPTQ2MCcsICBiaW86ICcnLCAgZmxhdm91cjogJ3Bhc3RhY2Npbyd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdNaWtlJywgICAgIGxhc3Q6ICdHcmFib3dza2knIH0sIGpvaW5lZERhdGU6ICdPY3QgMiwgMjAxMicsICAgbG9jYXRpb246ICdMb25kb24sIFVLJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMy5naXRodWJ1c2VyY29udGVudC5jb20vdS8yNDY0OTY2P3Y9MyZzPTQ2MCcsICBiaW86ICcnLCAgZmxhdm91cjogJ3ZhbmlsbGEnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnUm9iJywgICAgICBsYXN0OiAnTW9ycmlzJyB9LCAgICBqb2luZWREYXRlOiAnT2N0IDE4LCAyMDEyJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMjU4NzE2Mz92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdjaG9jb2xhdGUnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnU2ltb24nLCAgICBsYXN0OiAnVGF5bG9yJyB9LCAgICBqb2luZWREYXRlOiAnU2VwIDE0LCAyMDEzJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczEuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNTQ1NzI2Nz92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdjYXJhbWVsJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ1N0ZXZlbicsICAgbGFzdDogJ1N0ZW5la2VyJyB9LCAgam9pbmVkRGF0ZTogJ0p1biAzMCwgMjAwOCcsICBsb2NhdGlvbjogJ1N5ZG5leSwgQVUnLCAgICAgICAgICBpbWc6ICdodHRwczovL2F2YXRhcnMzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1NTU0P3Y9MyZzPTQ2MCcsICAgIGJpbzogJycsICBmbGF2b3VyOiAnc3RyYXdiZXJyeSd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdUb20nLCAgICAgIGxhc3Q6ICdXYWxrZXInIH0sICAgIGpvaW5lZERhdGU6ICdBcHIgMTksIDIwMTEnLCAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMi5naXRodWJ1c2VyY29udGVudC5jb20vdS83Mzc4MjE/dj0zJnM9NDYwJywgICBiaW86ICcnLCAgZmxhdm91cjogJ2JhbmFuYSd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdUdWFuJywgICAgIGxhc3Q6ICdIb2FuZycgfSwgICAgIGpvaW5lZERhdGU6ICdNYXIgMTksIDIwMTMnLCAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMC5naXRodWJ1c2VyY29udGVudC5jb20vdS8zOTA2NTA1P3Y9MyZzPTQ2MCcsICBiaW86ICcnLCAgZmxhdm91cjogJ2xlbW9uJyB9XG5dOyIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFJlYWN0Q1NTVHJhbnNpdGlvbkdyb3VwID0gUmVhY3QuYWRkb25zLkNTU1RyYW5zaXRpb25Hcm91cDtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgVG91Y2hzdG9uZSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpO1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcblxudmFyIHZpZXdzID0ge1xuXG4gIC8vIGFwcFxuICAnaG9tZSc6IHJlcXVpcmUoJy4vdmlld3MvaG9tZScpLFxuXG4gIC8vIGNvbXBvbmVudHNcbiAgJ2NvbXBvbmVudC1mZWVkYmFjayc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2ZlZWRiYWNrJyksXG5cbiAgJ2NvbXBvbmVudC1oZWFkZXJiYXInOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9iYXItaGVhZGVyJyksXG4gICdjb21wb25lbnQtaGVhZGVyYmFyLXNlYXJjaCc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2Jhci1oZWFkZXItc2VhcmNoJyksXG4gICdjb21wb25lbnQtYWxlcnRiYXInOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9iYXItYWxlcnQnKSxcbiAgJ2NvbXBvbmVudC1hY3Rpb25iYXInOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9iYXItYWN0aW9uJyksXG4gICdjb21wb25lbnQtZm9vdGVyYmFyJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvYmFyLWZvb3RlcicpLFxuXG4gICdjb21wb25lbnQtcGFzc2NvZGUnOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9wYXNzY29kZScpLFxuICAnY29tcG9uZW50LXRvZ2dsZSc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L3RvZ2dsZScpLFxuICAnY29tcG9uZW50LWZvcm0nOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9mb3JtJyksXG5cbiAgJ2NvbXBvbmVudC1zaW1wbGUtbGlzdCc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2xpc3Qtc2ltcGxlJyksXG4gICdjb21wb25lbnQtY29tcGxleC1saXN0JzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvbGlzdC1jb21wbGV4JyksXG4gICdjb21wb25lbnQtY2F0ZWdvcmlzZWQtbGlzdCc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2xpc3QtY2F0ZWdvcmlzZWQnKSxcblxuICAvLyB0cmFuc2l0aW9uc1xuICAndHJhbnNpdGlvbnMnOiByZXF1aXJlKCcuL3ZpZXdzL3RyYW5zaXRpb25zJyksXG4gICd0cmFuc2l0aW9ucy10YXJnZXQnOiByZXF1aXJlKCcuL3ZpZXdzL3RyYW5zaXRpb25zLXRhcmdldCcpLFxuXG4gIC8vIGRldGFpbHMgdmlld1xuICAnZGV0YWlscyc6IHJlcXVpcmUoJy4vdmlld3MvZGV0YWlscycpLFxuICAncmFkaW8tbGlzdCc6IHJlcXVpcmUoJy4vdmlld3MvcmFkaW8tbGlzdCcpXG59O1xuXG52YXIgQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICBtaXhpbnM6IFtUb3VjaHN0b25lLmNyZWF0ZUFwcCh2aWV3cyldLFxuXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFZpZXcgPSAnaG9tZSc7XG5cbiAgICAvLyByZXNvcnQgdG8gI3ZpZXdOYW1lIGlmIGl0IGV4aXN0c1xuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgdmFyIGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zbGljZSgxKTtcblxuICAgICAgaWYgKGhhc2ggaW4gdmlld3MpIHN0YXJ0VmlldyA9IGhhc2g7XG4gICAgfVxuXG4gICAgdmFyIGluaXRpYWxTdGF0ZSA9IHtcbiAgICAgIGN1cnJlbnRWaWV3OiBzdGFydFZpZXcsXG4gICAgICBpc05hdGl2ZUFwcDogKHR5cGVvZiBjb3Jkb3ZhICE9PSAndW5kZWZpbmVkJylcbiAgICB9O1xuXG4gICAgcmV0dXJuIGluaXRpYWxTdGF0ZTtcbiAgfSxcblxuICBnb3RvRGVmYXVsdFZpZXc6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNob3dWaWV3KCdob21lJywgJ2ZhZGUnKTtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwV3JhcHBlckNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuICAgICAgJ2FwcC13cmFwcGVyJzogdHJ1ZSxcbiAgICAgICdpcy1uYXRpdmUtYXBwJzogdGhpcy5zdGF0ZS5pc05hdGl2ZUFwcFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPXthcHBXcmFwcGVyQ2xhc3NOYW1lfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkZXZpY2Utc2lsaG91ZXR0ZVwiPlxuICAgICAgICAgIDxSZWFjdENTU1RyYW5zaXRpb25Hcm91cCB0cmFuc2l0aW9uTmFtZT17dGhpcy5zdGF0ZS52aWV3VHJhbnNpdGlvbi5uYW1lfSB0cmFuc2l0aW9uRW50ZXI9e3RoaXMuc3RhdGUudmlld1RyYW5zaXRpb24uaW59IHRyYW5zaXRpb25MZWF2ZT17dGhpcy5zdGF0ZS52aWV3VHJhbnNpdGlvbi5vdXR9IGNsYXNzTmFtZT1cInZpZXctd3JhcHBlclwiIGNvbXBvbmVudD1cImRpdlwiPlxuICAgICAgICAgICAge3RoaXMuZ2V0Q3VycmVudFZpZXcoKX1cbiAgICAgICAgICA8L1JlYWN0Q1NTVHJhbnNpdGlvbkdyb3VwPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkZW1vLXdyYXBwZXJcIj5cbiAgICAgICAgICA8aW1nIGNsYXNzTmFtZT1cIm1lZXR1cGxvZ29cIiBzcmM9XCJpbWcvbWVldHVwLWxvZ28ucG5nXCIgYWx0PVwiVG91Y2hzdG9uZUpTXCIgd2lkdGg9XCI3MFwiIC8+XG4gICAgICAgICAgPGltZyBzcmM9XCJpbWcvbG9nby1tYXJrLnN2Z1wiIGFsdD1cIlRvdWNoc3RvbmVKU1wiIHdpZHRoPVwiNDBcIiAvPlxuICAgICAgICAgIDxpbWcgc3JjPVwiaW1nL2FsZ29saWEtbG9nby5wbmdcIiBhbHQ9XCJUb3VjaHN0b25lSlNcIiB3aWR0aD1cIjUwXCIgLz5cbiAgICAgICAgICA8aDE+XG4gICAgICAgICAgICBNZWV0dXAgLyBUb3VjaHN0b25lSlMgLyBBbGdvbGlhXG4gICAgICAgICAgPC9oMT5cbiAgICAgICAgICA8c21hbGw+UmVhY3QgRXVyb3BlIEhhY2thdGhvbjwvc21hbGw+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHN0YXJ0QXBwICgpIHtcbiAgUmVhY3QucmVuZGVyKDxBcHAgLz4sIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKSk7XG59XG5cbmZ1bmN0aW9uIG9uRGV2aWNlUmVhZHkgKCkge1xuICBTdGF0dXNCYXIuc3R5bGVEZWZhdWx0KCk7XG4gIHN0YXJ0QXBwKCk7XG59XG5cbmlmICh0eXBlb2YgY29yZG92YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgc3RhcnRBcHAoKTtcbn0gZWxzZSB7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5Jywgb25EZXZpY2VSZWFkeSwgZmFsc2UpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7fTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGZsYXNoQWxlcnQ6IGZ1bmN0aW9uIChhbGVydENvbnRlbnQpIHtcblx0XHRhbGVydChhbGVydENvbnRlbnQpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJBY3Rpb24gQmFyXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgbGFiZWw9XCJCYWNrXCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5MYWJlbCBPbmx5PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbnM+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9ICBsYWJlbD1cIlByaW1hcnkgQWN0aW9uXCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gbGFiZWw9XCJTZWNvbmRhcnkgQWN0aW9uXCIgLz5cblx0XHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5JY29uIE9ubHk8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gIGljb249XCJpb24tYXJyb3ctdXAtY1wiIC8+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9IGljb249XCJpb24tYXJyb3ctZG93bi1jXCIgLz5cblx0XHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5JY29uICZhbXA7IExhYmVsPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbnM+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9ICBsYWJlbD1cIlByaW1hcnkgQWN0aW9uXCIgICAgaWNvbj1cImlvbi1hcnJvdy11cC1jXCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gbGFiZWw9XCJTZWNvbmRhcnkgQWN0aW9uXCIgaWNvbj1cImlvbi1hcnJvdy1kb3duLWNcIiAvPlxuXHRcdFx0XHRcdFx0PC9VSS5BY3Rpb25CdXR0b25zPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPkVhc2lseSBDdXN0b21pc2FibGU8L2Rpdj5cblx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9ucyBjbGFzc05hbWU9XCJzcGVjaWFsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9uIG9uVGFwPXt0aGlzLmZsYXNoQWxlcnQuYmluZCh0aGlzLCAnWW91IHRhcHBlZCBhbiBhY3Rpb24gYnV0dG9uLicpfSAgbGFiZWw9XCJQcmltYXJ5XCIgICBpY29uPVwiaW9uLWFuZHJvaWQtY29udGFjdFwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9uIG9uVGFwPXt0aGlzLmZsYXNoQWxlcnQuYmluZCh0aGlzLCAnWW91IHRhcHBlZCBhbiBhY3Rpb24gYnV0dG9uLicpfSAgbGFiZWw9XCJTZWNvbmRhcnlcIiBpY29uPVwiaW9uLWFuZHJvaWQtY29udGFjdHNcIiAvPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gIGxhYmVsPVwiVGVydGlhcnlcIiAgaWNvbj1cImlvbi1hbmRyb2lkLWZyaWVuZHNcIiAvPlxuXHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhbGVydFR5cGU6ICdkZWZhdWx0J1xuXHRcdH1cblx0fSxcblxuXHRoYW5kbGVBbGVydENoYW5nZTogZnVuY3Rpb24gKG5ld0FsZXJ0VHlwZSkge1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRhbGVydFR5cGU6IG5ld0FsZXJ0VHlwZVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkFsZXJ0IEJhclwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5BbGVydGJhciB0eXBlPXt0aGlzLnN0YXRlLmFsZXJ0VHlwZX0+V2hlbiB0aGUgc3RhdGUgaXMgXCJ7dGhpcy5zdGF0ZS5hbGVydFR5cGV9XCI8L1VJLkFsZXJ0YmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0XCI+XG5cdFx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLmFsZXJ0VHlwZX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlQWxlcnRDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ0RlZmF1bHQnLCAgdmFsdWU6ICdkZWZhdWx0JyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnUHJpbWFyeScsICB2YWx1ZTogJ3ByaW1hcnknIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTdWNjZXNzJywgIHZhbHVlOiAnc3VjY2VzcycgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1dhcm5pbmcnLCAgdmFsdWU6ICd3YXJuaW5nJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnRGFuZ2VyJywgICB2YWx1ZTogJ2RhbmdlcicgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlS2V5OiAnaWNvbidcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlRm9vdGVyQ2hhbmdlOiBmdW5jdGlvbiAobmV3VHlwZSkge1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR0eXBlS2V5OiBuZXdUeXBlXG5cdFx0fSk7XG5cblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBmb290ZXJiYXJDbGFzcyA9IFNldENsYXNzKHRoaXMuc3RhdGUudHlwZUtleSwge1xuXHRcdFx0J2Zvb3RlcmJhcic6IHRydWVcblx0XHR9KTtcblx0XHR2YXIgcmVuZGVyRm9vdGVyYmFyO1xuXG5cdFx0aWYgKHRoaXMuc3RhdGUudHlwZUtleSA9PT0gJ2ljb24nKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGljb249XCJpb24taW9zNy1hcnJvdy1sZWZ0XCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBpY29uPVwiaW9uLWlvczctYXJyb3ctcmlnaHRcIiBkaXNhYmxlZCAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGljb249XCJpb24taW9zNy1kb3dubG9hZFwiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gaWNvbj1cImlvbi1pb3M3LWJvb2ttYXJrcy1vdXRsaW5lXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBpY29uPVwiaW9uLWlvczctYnJvd3NlcnNcIiAvPlxuXHRcdFx0PC9VSS5Gb290ZXJiYXI+KVxuXHRcdH0gZWxzZSBpZiAodGhpcy5zdGF0ZS50eXBlS2V5ID09PSAnbGFiZWwnKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gbGFiZWw9XCJGb3J3YXJkXCIgZGlzYWJsZWQgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkRvd25sb2FkXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkJvb2ttYXJrc1wiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gbGFiZWw9XCJUYWJzXCIgLz5cblx0XHRcdDwvVUkuRm9vdGVyYmFyPilcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUudHlwZUtleSA9PT0gJ2JvdGgnKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24taW9zNy1hcnJvdy1sZWZ0XCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkZvcndhcmRcIiBpY29uPVwiaW9uLWlvczctYXJyb3ctcmlnaHRcIiBkaXNhYmxlZCAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiRG93bmxvYWRcIiBpY29uPVwiaW9uLWlvczctZG93bmxvYWRcIiAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQm9va21hcmtzXCIgaWNvbj1cImlvbi1pb3M3LWJvb2ttYXJrcy1vdXRsaW5lXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIlRhYnNcIiBpY29uPVwiaW9uLWlvczctYnJvd3NlcnNcIiAvPlxuXHRcdFx0PC9VSS5Gb290ZXJiYXI+KVxuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiRm9vdGVyIEJhclwiPlxuXHRcdFx0XHRcdDxMaW5rIHRvPVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItYnV0dG9uIGlvbi1jaGV2cm9uLWxlZnRcIiBjb21wb25lbnQ9XCJidXR0b25cIj5CYWNrPC9MaW5rPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHR7Lyo8ZGl2IGNsYXNzTmFtZT1cInZpZXctaW5uZXJcIj5cblx0XHRcdFx0XHRcdDxVSS5Ub2dnbGUgdmFsdWU9e3RoaXMuc3RhdGUudHlwZUtleX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlRm9vdGVyQ2hhbmdlfSBvcHRpb25zPXtbXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdJY29uJywgdmFsdWU6ICdpY29uJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnTGFiZWwnLCB2YWx1ZTogJ2xhYmVsJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQm90aCcsIHZhbHVlOiAnYm90aCcgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj4qL31cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInZpZXctZmVlZGJhY2tcIj5cblx0XHRcdFx0XHRcdFlvdXIgYXBwJ3MgYW1hemluZyBjb250ZW50IGhlcmUuXG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHRcdHtyZW5kZXJGb290ZXJiYXJ9XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxudmFyIFRpbWVycyA9IHJlcXVpcmUoJ3JlYWN0LXRpbWVycycpO1xudmFyIE1vbnRocyA9IHJlcXVpcmUoJy4uLy4uLy4uL2RhdGEvbW9udGhzJyk7XG5cbnZhciBTZWFyY2ggPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW1RpbWVycygpXSxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRzZWFyY2hTdHJpbmc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWRcblx0fSxcblxuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnJlZnMuaW5wdXQuZ2V0RE9NTm9kZSgpLmZvY3VzKCk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKGV2ZW50LnRhcmdldC52YWx1ZSk7XG5cdH0sXG5cblx0cmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKCcnKTtcblx0XHR0aGlzLnJlZnMuaW5wdXQuZ2V0RE9NTm9kZSgpLmZvY3VzKCk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgY2xlYXJJY29uID0gQm9vbGVhbih0aGlzLnByb3BzLnNlYXJjaFN0cmluZy5sZW5ndGgpID8gPFRhcHBhYmxlIG9uVGFwPXt0aGlzLnJlc2V0fSBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybS1jbGVhciBpb24tY2xvc2UtY2lyY2xlZFwiIC8+IDogJyc7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGhlaWdodD1cIjM2cHhcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybSBTdWJoZWFkZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybS1maWVsZCBIZWFkZXJiYXItZm9ybS1pY29uIGlvbi1pb3M3LXNlYXJjaC1zdHJvbmdcIj5cblx0XHRcdFx0XHQ8aW5wdXQgcmVmPVwiaW5wdXRcIiB2YWx1ZT17dGhpcy5wcm9wcy5zZWFyY2hTdHJpbmd9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUNoYW5nZX0gY2xhc3NOYW1lPVwiSGVhZGVyYmFyLWZvcm0taW5wdXRcIiBwbGFjZWhvbGRlcj0nU2VhcmNoLi4uJyAvPlxuXHRcdFx0XHRcdHtjbGVhckljb259XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0KTtcblx0fVxuXG59KTtcblxudmFyIEl0ZW0gPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJsaXN0LWl0ZW1cIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+e3RoaXMucHJvcHMubW9udGgubmFtZX08L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG52YXIgTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VhcmNoU3RyaW5nOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgc2VhcmNoU3RyaW5nID0gdGhpcy5wcm9wcy5zZWFyY2hTdHJpbmc7XG5cdFx0dmFyIG1vbnRocyA9IFtdO1xuXHRcdHZhclx0bGFzdFNlYXNvbiA9ICcnO1xuXHRcdHZhciByZW5kZXJMaXN0ID0gPGRpdiBjbGFzc05hbWU9XCJ2aWV3LWZlZWRiYWNrLXRleHRcIj5ObyBtYXRjaCBmb3VuZC4uLjwvZGl2PjtcblxuXHRcdHRoaXMucHJvcHMubW9udGhzLmZvckVhY2goZnVuY3Rpb24gKG1vbnRoLCBpKSB7XG5cblx0XHRcdC8vIGZpbHRlciBtb250aHNcblx0XHRcdGlmIChzZWFyY2hTdHJpbmcgJiYgbW9udGgubmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGluc2VydCBjYXRlZ29yaWVzXG5cblx0XHRcdHZhciBzZWFzb24gPSBtb250aC5zZWFzb247XG5cblx0XHRcdGlmIChsYXN0U2Vhc29uICE9PSBzZWFzb24pIHtcblx0XHRcdFx0bGFzdFNlYXNvbiA9IHNlYXNvbjtcblxuXHRcdFx0XHRtb250aHMucHVzaChcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaGVhZGVyXCIga2V5PXtcImxpc3QtaGVhZGVyLVwiICsgaX0+e3NlYXNvbn08L2Rpdj5cblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY3JlYXRlIGxpc3RcblxuXHRcdFx0bW9udGgua2V5ID0gJ21vbnRoLScgKyBpO1xuXHRcdFx0bW9udGhzLnB1c2goUmVhY3QuY3JlYXRlRWxlbWVudChJdGVtLCB7IG1vbnRoOiBtb250aCB9KSk7XG5cdFx0fSk7XG5cblx0XHR2YXIgd3JhcHBlckNsYXNzTmFtZSA9IFNldENsYXNzKG1vbnRocy5sZW5ndGggPyAncGFuZWwgbWItMCcgOiAndmlldy1mZWVkYmFjaycpO1xuXG5cdFx0aWYgKG1vbnRocy5sZW5ndGgpIHtcblx0XHRcdHJlbmRlckxpc3QgPSBtb250aHM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt3cmFwcGVyQ2xhc3NOYW1lfT5cblx0XHRcdFx0e3JlbmRlckxpc3R9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlYXJjaFN0cmluZzogJycsXG5cdFx0XHRtb250aHM6IE1vbnRoc1xuXHRcdH1cblx0fSxcblxuXHR1cGRhdGVTZWFyY2g6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHR0aGlzLnNldFN0YXRlKHsgc2VhcmNoU3RyaW5nOiBzdHIgfSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkZpbHRlciBNb250aHNcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8U2VhcmNoIHNlYXJjaFN0cmluZz17dGhpcy5zdGF0ZS5zZWFyY2hTdHJpbmd9IG9uQ2hhbmdlPXt0aGlzLnVwZGF0ZVNlYXJjaH0gLz5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8TGlzdCBtb250aHM9e3RoaXMuc3RhdGUubW9udGhzfSBzZWFyY2hTdHJpbmc9e3RoaXMuc3RhdGUuc2VhcmNoU3RyaW5nfSAvPlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZUtleTogJ2RlZmF1bHQnXG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUhlYWRlckNoYW5nZTogZnVuY3Rpb24gKG5ld1R5cGUpIHtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dHlwZUtleTogbmV3VHlwZVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT17dGhpcy5zdGF0ZS50eXBlS2V5fSBsYWJlbD1cIkhlYWRlciBCYXJcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0XCI+XG5cdFx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLnR5cGVLZXl9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUhlYWRlckNoYW5nZX0gb3B0aW9ucz17W1xuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnRGVmYXVsdCcsICB2YWx1ZTogJ2RlZmF1bHQnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdHcmVlbicsIHZhbHVlOiAnZ3JlZW4nIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdCbHVlJywgdmFsdWU6ICdibHVlJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnTGlnaHQgQmx1ZScsIHZhbHVlOiAnbGlnaHQtYmx1ZScgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1llbGxvdycsIHZhbHVlOiAneWVsbG93JyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnT3JhbmdlJywgdmFsdWU6ICdvcmFuZ2UnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdSZWQnLCB2YWx1ZTogJ3JlZCcgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1BpbmsnLCB2YWx1ZTogJ3BpbmsnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdQdXJwbGUnLCB2YWx1ZTogJ3B1cnBsZScgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGZsYXNoQWxlcnQ6IGZ1bmN0aW9uIChhbGVydENvbnRlbnQpIHtcblx0XHR3aW5kb3cuYWxlcnQoYWxlcnRDb250ZW50KTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkZlZWRiYWNrXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiBsYWJlbD1cIkJhY2tcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50PlxuXHRcdFx0XHRcdDxVSS5GZWVkYmFjayBpY29uTmFtZT1cImlvbi1jb21wYXNzXCIgaWNvblR5cGU9XCJwcmltYXJ5XCIgaGVhZGVyPVwiT3B0aW9uYWwgSGVhZGVyXCIgc3ViaGVhZGVyPVwiU3ViaGVhZGVyLCBhbHNvIG9wdGlvbmFsXCIgdGV4dD1cIkZlZWRiYWNrIG1lc3NhZ2UgY29weSBnb2VzIGhlcmUuIEl0IGNhbiBiZSBvZiBhbnkgbGVuZ3RoLlwiIGFjdGlvblRleHQ9XCJPcHRpb25hbCBBY3Rpb25cIiBhY3Rpb25Gbj17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSBjbGlja2VkIHRoZSBhY3Rpb24uJyl9IC8+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Zmxhdm91cjogJ3N0cmF3YmVycnknXG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUZsYXZvdXJDaGFuZ2U6IGZ1bmN0aW9uIChuZXdGbGF2b3VyKSB7XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGZsYXZvdXI6IG5ld0ZsYXZvdXJcblx0XHR9KTtcblxuXHR9LFxuXG5cdGhhbmRsZVN3aXRjaDogZnVuY3Rpb24gKGtleSwgZXZlbnQpIHtcblx0XHR2YXIgbmV3U3RhdGUgPSB7fTtcblx0XHRuZXdTdGF0ZVtrZXldID0gIXRoaXMuc3RhdGVba2V5XTtcblxuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJGb3JtXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgbGFiZWw9XCJCYWNrXCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiAvPlxuXHRcdFx0XHRcdDxVSS5Mb2FkaW5nQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiICB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgbGFiZWw9XCJTYXZlXCIgY2xhc3NOYW1lPVwiSGVhZGVyYmFyLWJ1dHRvbiByaWdodCBpcy1wcmltYXJ5XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudCBncm93IHNjcm9sbGFibGU+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+RmluZCBhbiBleHBlcnQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuTGFiZWxTZWxlY3QgbGFiZWw9XCJTa2lsbFwiIHZhbHVlPXt0aGlzLnN0YXRlLmZsYXZvdXJ9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUZsYXZvdXJDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ3JlYWN0SnMnLCAgICB2YWx1ZTogJ3JlYWN0anMnIH0sXG5cdFx0XHRcdFx0XHRdfSAvPlxuXHRcdFx0XHRcdFx0PFVJLkxhYmVsSW5wdXQgbGFiZWw9XCJDaXR5XCIgdHlwZT1cInNlYXJjaFwiIGRlZmF1bHRWYWx1ZT1cIlBhcmlzXCIgcGxhY2Vob2xkZXI9XCJQYXJpc1wiIC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBNb250aHMgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL21vbnRocycpO1xuXG52YXIgSGVhZGVyTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbW9udGhzID0gW107XG5cdFx0dmFyXHRsYXN0U2Vhc29uID0gJyc7XG5cdFx0XG5cdFx0dGhpcy5wcm9wcy5tb250aHMuZm9yRWFjaChmdW5jdGlvbiAobW9udGgsIGkpIHtcblxuXHRcdFx0dmFyIHNlYXNvbiA9IG1vbnRoLnNlYXNvbjtcblxuXHRcdFx0aWYgKGxhc3RTZWFzb24gIT09IHNlYXNvbikge1xuXHRcdFx0XHRsYXN0U2Vhc29uID0gc2Vhc29uO1xuXG5cdFx0XHRcdG1vbnRocy5wdXNoKFxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibGlzdC1oZWFkZXJcIiBrZXk9e1wibGlzdC1oZWFkZXItXCIgKyBpfT57c2Vhc29ufTwvZGl2PlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRtb250aC5rZXkgPSAnbW9udGgtJyArIGk7XG5cdFx0XHRtb250aHMucHVzaCg8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaXRlbVwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPnttb250aC5uYW1lfTwvZGl2PjwvZGl2Pik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgbWItMFwiPlxuXHRcdFx0XHR7bW9udGhzfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiQ2F0ZWdvcmlzZWQgTGlzdFwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgbGFiZWw9XCJCYWNrXCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudCBncm93IHNjcm9sbGFibGU+XG5cdFx0XHRcdFx0PEhlYWRlckxpc3QgbW9udGhzPXtNb250aHN9IC8+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBQZW9wbGUgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL3Blb3BsZScpO1xuXG52YXIgQ29tcGxleExpc3RJdGVtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBpbml0aWFscyA9IHRoaXMucHJvcHMudXNlci5uYW1lLmZpcnN0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcblx0XHRcdHRoaXMucHJvcHMudXNlci5uYW1lLmxhc3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCk7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PExpbmsgdG89XCJkZXRhaWxzXCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBwYXJhbXM9e3sgdXNlcjogdGhpcy5wcm9wcy51c2VyLCBwcmV2VmlldzogJ2NvbXBvbmVudC1jb21wbGV4LWxpc3QnIH19IGNsYXNzTmFtZT1cImxpc3QtaXRlbVwiIGNvbXBvbmVudD1cImRpdlwiPlxuXHRcdFx0XHQ8VUkuSXRlbU1lZGlhIGF2YXRhcj17dGhpcy5wcm9wcy51c2VyLmltZ30gYXZhdGFySW5pdGlhbHM9e2luaXRpYWxzfSAvPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0tY29udGVudFwiPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLXRpdGxlXCI+e1t0aGlzLnByb3BzLnVzZXIubmFtZS5maXJzdCwgdGhpcy5wcm9wcy51c2VyLm5hbWUubGFzdF0uam9pbignICcpfTwvZGl2PlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLXN1YnRpdGxlXCI+e3RoaXMucHJvcHMudXNlci5sb2NhdGlvbn08L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8VUkuSXRlbU5vdGUgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD17dGhpcy5wcm9wcy51c2VyLmpvaW5lZERhdGUuc2xpY2UoLTQpfSBpY29uPVwiaW9uLWNoZXZyb24tcmlnaHRcIiAvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvTGluaz5cblxuXHRcdCk7XG5cdH1cbn0pO1xuXG52YXIgQ29tcGxleExpc3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHVzZXJzID0gW107XG5cdFx0dGhpcy5wcm9wcy51c2Vycy5mb3JFYWNoKGZ1bmN0aW9uICh1c2VyLCBpKSB7XG5cdFx0XHR1c2VyLmtleSA9ICd1c2VyLScgKyBpO1xuXHRcdFx0dXNlcnMucHVzaChSZWFjdC5jcmVhdGVFbGVtZW50KENvbXBsZXhMaXN0SXRlbSwgeyB1c2VyOiB1c2VyIH0pKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbCBwYW5lbC0tZmlyc3QgYXZhdGFyLWxpc3RcIj5cblx0XHRcdFx0XHR7dXNlcnN9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGhlaWdodD1cIjM2cHhcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybSBTdWJoZWFkZXJcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxDb21wbGV4TGlzdCB1c2Vycz17UGVvcGxlfSAvPlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0U2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgUGVvcGxlID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9wZW9wbGUnKTtcblxudmFyIFNpbXBsZUxpc3RJdGVtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8TGluayB0bz1cImRldGFpbHNcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIHBhcmFtcz17eyB1c2VyOiB0aGlzLnByb3BzLnVzZXIsIHByZXZWaWV3OiAnY29tcG9uZW50LXNpbXBsZS1saXN0JyB9fSBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLXRpdGxlXCI+e1t0aGlzLnByb3BzLnVzZXIubmFtZS5maXJzdCwgdGhpcy5wcm9wcy51c2VyLm5hbWUubGFzdF0uam9pbignICcpfTwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvTGluaz5cblx0XHQpO1xuXHR9XG59KTtcblxudmFyIFNpbXBsZUxpc3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHVzZXJzID0gW107XG5cdFx0XG5cdFx0dGhpcy5wcm9wcy51c2Vycy5mb3JFYWNoKGZ1bmN0aW9uICh1c2VyLCBpKSB7XG5cdFx0XHR1c2VyLmtleSA9ICd1c2VyLScgKyBpO1xuXHRcdFx0dXNlcnMucHVzaChSZWFjdC5jcmVhdGVFbGVtZW50KFNpbXBsZUxpc3RJdGVtLCB7IHVzZXI6IHVzZXIgfSkpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIHBhbmVsLS1maXJzdFwiPlxuXHRcdFx0XHRcdHt1c2Vyc31cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJTaW1wbGUgTGlzdFwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudCBncm93IHNjcm9sbGFibGU+XG5cdFx0XHRcdFx0PFNpbXBsZUxpc3QgdXNlcnM9e1Blb3BsZX0gLz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdERpYWxvZ3MgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5EaWFsb2dzLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIERpYWxvZ3NdLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7fVxuXHR9LFxuXG5cdGhhbmRsZVBhc3Njb2RlOiBmdW5jdGlvbiAocGFzc2NvZGUpIHtcblx0XHRhbGVydCgnWW91ciBwYXNzY29kZSBpcyBcIicgKyBwYXNzY29kZSArICdcIi4nKTtcblxuXHRcdHRoaXMuc2hvd1ZpZXcoJ2hvbWUnLCAnZmFkZScpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiRW50ZXIgUGFzc2NvZGVcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuUGFzc2NvZGUgYWN0aW9uPXt0aGlzLmhhbmRsZVBhc3Njb2RlfSBoZWxwVGV4dD1cIkVudGVyIGEgcGFzc2NvZGVcIiAvPlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0U2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgTW9udGhzID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9tb250aHMnKTtcblxudmFyIE1vbnRoTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbW9udGhzID0gW107XG5cdFx0dmFyXHRsYXN0U2Vhc29uID0gJyc7XG5cdFx0dmFyIGZpbHRlclN0YXRlID0gdGhpcy5wcm9wcy5maWx0ZXJTdGF0ZTtcblx0XHRcblx0XHR0aGlzLnByb3BzLm1vbnRocy5mb3JFYWNoKGZ1bmN0aW9uIChtb250aCwgaSkge1xuXHRcdFx0XG5cdFx0XHRpZiAoZmlsdGVyU3RhdGUgIT09ICdhbGwnICYmIGZpbHRlclN0YXRlICE9PSBtb250aC5zZWFzb24udG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBzZWFzb24gPSBtb250aC5zZWFzb247XG5cblx0XHRcdGlmIChsYXN0U2Vhc29uICE9PSBzZWFzb24pIHtcblx0XHRcdFx0bGFzdFNlYXNvbiA9IHNlYXNvbjtcblxuXHRcdFx0XHRtb250aHMucHVzaChcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaGVhZGVyXCIga2V5PXtcImxpc3QtaGVhZGVyLVwiICsgaX0+e3NlYXNvbn08L2Rpdj5cblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0bW9udGgua2V5ID0gJ21vbnRoLScgKyBpO1xuXHRcdFx0bW9udGhzLnB1c2goPGRpdiBjbGFzc05hbWU9XCJsaXN0LWl0ZW1cIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj57bW9udGgubmFtZX08L2Rpdj48L2Rpdj4pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIG1iLTBcIj5cblx0XHRcdFx0e21vbnRoc31cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFjdGl2ZVRvZ2dsZUl0ZW1LZXk6ICdhbGwnLFxuXHRcdFx0dHlwZUtleTogJ3ByaW1hcnknLFxuXHRcdFx0bW9udGhzOiBNb250aHNcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlVG9nZ2xlQWN0aXZlQ2hhbmdlOiBmdW5jdGlvbiAobmV3SXRlbSkge1xuXG5cdFx0dmFyIHNlbGVjdGVkSXRlbSA9IG5ld0l0ZW07XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5hY3RpdmVUb2dnbGVJdGVtS2V5ID09PSBuZXdJdGVtKSB7XG5cdFx0XHRzZWxlY3RlZEl0ZW0gPSAnYWxsJztcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGFjdGl2ZVRvZ2dsZUl0ZW1LZXk6IHNlbGVjdGVkSXRlbVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIlRvZ2dsZVwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBoZWlnaHQ9XCIzNnB4XCIgY2xhc3NOYW1lPVwiU3ViaGVhZGVyXCI+XG5cdFx0XHRcdFx0PFVJLlRvZ2dsZSB2YWx1ZT17dGhpcy5zdGF0ZS5hY3RpdmVUb2dnbGVJdGVtS2V5fSBvbkNoYW5nZT17dGhpcy5oYW5kbGVUb2dnbGVBY3RpdmVDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTdW1tZXInLCB2YWx1ZTogJ3N1bW1lcicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdBdXR1bW4nLCB2YWx1ZTogJ2F1dHVtbicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdXaW50ZXInLCB2YWx1ZTogJ3dpbnRlcicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTcHJpbmcnLCB2YWx1ZTogJ3NwcmluZycgfVxuXHRcdFx0XHRcdF19IC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxNb250aExpc3QgbW9udGhzPXt0aGlzLnN0YXRlLm1vbnRoc30gZmlsdGVyU3RhdGU9e3RoaXMuc3RhdGUuYWN0aXZlVG9nZ2xlSXRlbUtleX0gLz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0RGlhbG9ncyA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkRpYWxvZ3MsXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgVGltZXJzID0gcmVxdWlyZSgncmVhY3QtdGltZXJzJylcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIERpYWxvZ3MsIFRpbWVycygpXSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cHJldlZpZXc6ICdob21lJ1xuXHRcdH1cblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cHJvY2Vzc2luZzogZmFsc2UsXG5cdFx0XHRmb3JtSXNWYWxpZDogZmFsc2UsXG5cdFx0XHRiaW9WYWx1ZTogdGhpcy5wcm9wcy51c2VyLmJpbyB8fCAnJ1xuXHRcdH1cblx0fSxcblxuXHRzaG93Rmxhdm91ckxpc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnNob3dWaWV3KCdyYWRpby1saXN0JywgJ3Nob3ctZnJvbS1yaWdodCcsIHsgdXNlcjogdGhpcy5wcm9wcy51c2VyLCBmbGF2b3VyOiB0aGlzLnN0YXRlLmZsYXZvdXIgfSk7XG5cdH0sXG5cblx0aGFuZGxlQmlvSW5wdXQ6IGZ1bmN0aW9uIChldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0YmlvVmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZSxcblx0XHRcdGZvcm1Jc1ZhbGlkOiBldmVudC50YXJnZXQudmFsdWUubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0sXG5cblx0cHJvY2Vzc0Zvcm06IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgcHJvY2Vzc2luZzogdHJ1ZSB9KTtcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnNob3dWaWV3KCdob21lJywgJ2ZhZGUnLCB7fSk7XG5cdFx0fSwgNzUwKTtcblx0fSxcblxuXHRmbGFzaEFsZXJ0OiBmdW5jdGlvbiAoYWxlcnRDb250ZW50LCBjYWxsYmFjaykge1xuXHRcdHJldHVybiBjYWxsYmFjayh0aGlzLnNob3dBbGVydERpYWxvZyh7IG1lc3NhZ2U6IGFsZXJ0Q29udGVudCB9KSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHQvLyBmaWVsZHNcblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD17W3RoaXMucHJvcHMudXNlci5uYW1lLmZpcnN0LCB0aGlzLnByb3BzLnVzZXIubmFtZS5sYXN0XS5qb2luKCcgJyl9PlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9e3RoaXMucHJvcHMucHJldlZpZXd9IHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdFx0PFVJLkxvYWRpbmdCdXR0b24gbG9hZGluZz17dGhpcy5zdGF0ZS5wcm9jZXNzaW5nfSBkaXNhYmxlZD17IXRoaXMuc3RhdGUuZm9ybUlzVmFsaWR9IG9uVGFwPXt0aGlzLnByb2Nlc3NGb3JtfSBsYWJlbD1cIlNhdmVcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItYnV0dG9uIHJpZ2h0IGlzLXByaW1hcnlcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHR7Lyo8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5CYXNpYyBkZXRhaWxzPC9kaXY+Ki99XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbCBwYW5lbC0tZmlyc3RcIj5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IGxhYmVsPVwiTG9jYXRpb25cIiB2YWx1ZT17dGhpcy5wcm9wcy51c2VyLmxvY2F0aW9ufSAgIHBsYWNlaG9sZGVyPVwiU3VidXJiLCBDb3VudHJ5XCIgLz5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IGxhYmVsPVwiSm9pbmVkXCIgICB2YWx1ZT17dGhpcy5wcm9wcy51c2VyLmpvaW5lZERhdGV9IHBsYWNlaG9sZGVyPVwiRGF0ZVwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuTGFiZWxUZXh0YXJlYSBsYWJlbD1cIk5vdGVcIiAgIHZhbHVlPXt0aGlzLnN0YXRlLmJpb1ZhbHVlfSAgICAgICAgcGxhY2Vob2xkZXI9XCIocmVxdWlyZWQpXCIgb25DaGFuZ2U9e3RoaXMuaGFuZGxlQmlvSW5wdXR9IC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PFRhcHBhYmxlIG9uVGFwPXt0aGlzLmZsYXNoQWxlcnQuYmluZCh0aGlzLCAnWW91IGNsaWNrZWQgdGhlIFByaW1hcnkgQnV0dG9uLicpfSBjbGFzc05hbWU9XCJwYW5lbC1idXR0b24gcHJpbWFyeVwiIGNvbXBvbmVudD1cImJ1dHRvblwiPlxuXHRcdFx0XHRcdFx0SSd2ZSB0YWxrZWQgdG8gaGltXG5cdFx0XHRcdFx0PC9UYXBwYWJsZT5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uO1xudmFyIExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rO1xudmFyIFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG52YXIgU2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBUaW1lcnMgPSByZXF1aXJlKCdyZWFjdC10aW1lcnMnKTtcblxudmFyIFBlb3BsZSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvcGVvcGxlJyk7XG5cbnZhciBDb21wbGV4TGlzdEl0ZW0gPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGluaXRpYWxzID0gdGhpcy5wcm9wcy51c2VyLm5hbWUuZmlyc3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgK1xuXHRcdFx0dGhpcy5wcm9wcy51c2VyLm5hbWUubGFzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKTtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8TGluayB0bz1cImRldGFpbHNcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIHBhcmFtcz17eyB1c2VyOiB0aGlzLnByb3BzLnVzZXIsIHByZXZWaWV3OiAnY29tcG9uZW50LWNvbXBsZXgtbGlzdCcgfX0gY2xhc3NOYW1lPVwibGlzdC1pdGVtXCIgY29tcG9uZW50PVwiZGl2XCI+XG5cdFx0XHRcdDxVSS5JdGVtTWVkaWEgYXZhdGFyPXt0aGlzLnByb3BzLnVzZXIuaW1nfSBhdmF0YXJJbml0aWFscz17aW5pdGlhbHN9IC8+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1jb250ZW50XCI+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0tdGl0bGVcIj57W3RoaXMucHJvcHMudXNlci5uYW1lLmZpcnN0LCB0aGlzLnByb3BzLnVzZXIubmFtZS5sYXN0XS5qb2luKCcgJyl9PC9kaXY+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0tc3VidGl0bGVcIj57dGhpcy5wcm9wcy51c2VyLmxvY2F0aW9ufTwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxVSS5JdGVtTm90ZSB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPXt0aGlzLnByb3BzLnVzZXIuam9pbmVkRGF0ZS5zbGljZSgtNCl9IGljb249XCJpb24tY2hldnJvbi1yaWdodFwiIC8+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9MaW5rPlxuXHRcdCk7XG5cdH1cbn0pO1xuXG52YXIgQ29tcGxleExpc3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHZhciB1c2VycyA9IFtdO1xuXHRcdHRoaXMucHJvcHMudXNlcnMuZm9yRWFjaChmdW5jdGlvbiAodXNlciwgaSkge1xuXHRcdFx0dXNlci5rZXkgPSAndXNlci0nICsgaTtcblx0XHRcdHVzZXJzLnB1c2goUmVhY3QuY3JlYXRlRWxlbWVudChDb21wbGV4TGlzdEl0ZW0sIHsgdXNlcjogdXNlciB9KSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0IGF2YXRhci1saXN0XCI+XG5cdFx0XHRcdFx0e3VzZXJzfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgaGVpZ2h0PVwiMzZweFwiIGNsYXNzTmFtZT1cIkhlYWRlcmJhci1mb3JtIFN1YmhlYWRlclwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJjb21wb25lbnQtZm9ybVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tbGVmdFwiICBjbGFzc05hbWU9XCJIZWFkZXJiYXItYnV0dG9uIHJpZ2h0XCIgbGFiZWw9XCJTZXR0aW5nc1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxDb21wbGV4TGlzdCB1c2Vycz17UGVvcGxlfSAvPlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0U2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGZsYXZvdXI6IHRoaXMucHJvcHMudXNlci5mbGF2b3VyXG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUZsYXZvdXJDaGFuZ2U6IGZ1bmN0aW9uIChuZXdGbGF2b3VyKSB7XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGZsYXZvdXI6IG5ld0ZsYXZvdXJcblx0XHR9KTtcblxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJGYXZvdXJpdGUgSWNlY3JlYW1cIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiZGV0YWlsc1wiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiB2aWV3UHJvcHM9e3sgdXNlcjogdGhpcy5wcm9wcy51c2VyLCBmbGF2b3VyOiB0aGlzLnN0YXRlLmZsYXZvdXIgfX0gbGFiZWw9XCJEZXRhaWxzXCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIHBhbmVsLS1maXJzdFwiPlxuXHRcdFx0XHRcdFx0PFVJLlJhZGlvTGlzdCB2YWx1ZT17dGhpcy5zdGF0ZS5mbGF2b3VyfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVGbGF2b3VyQ2hhbmdlfSBvcHRpb25zPXtbXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdWYW5pbGxhJywgICAgdmFsdWU6ICd2YW5pbGxhJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQ2hvY29sYXRlJywgIHZhbHVlOiAnY2hvY29sYXRlJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQ2FyYW1lbCcsICAgIHZhbHVlOiAnY2FyYW1lbCcgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1N0cmF3YmVycnknLCB2YWx1ZTogJ3N0cmF3YmVycnknIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdCYW5hbmEnLCAgICAgdmFsdWU6ICdiYW5hbmEnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdMZW1vbicsICAgICAgdmFsdWU6ICdsZW1vbicgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1Bhc3RhY2NpbycsICB2YWx1ZTogJ3Bhc3RhY2NpbycgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgVGltZXJzID0gcmVxdWlyZSgncmVhY3QtdGltZXJzJylcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIFRpbWVycygpXSxcblxuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnNob3dWaWV3KCd0cmFuc2l0aW9ucycsICdmYWRlJyk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJUYXJnZXQgVmlld1wiIC8+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudD5cblx0XHRcdFx0XHQ8VUkuRmVlZGJhY2sgaWNvbktleT1cImlvbi1pb3M3LXBob3Rvc1wiIGljb25UeXBlPVwibXV0ZWRcIiB0ZXh0PVwiSG9sZCBvbiBhIHNlYy4uLlwiIC8+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIlRyYW5zaXRpb25zXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiBsYWJlbD1cIkJhY2tcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5EZWZhdWx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5Ob25lPC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPkZhZGU8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwiZmFkZVwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPkZhZGU8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwiZmFkZS1leHBhbmRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5GYWRlIEV4cGFuZDwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJmYWRlLWNvbnRyYWN0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+RmFkZSBDb250cmFjdDwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5TaG93PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1sZWZ0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+U2hvdyBmcm9tIExlZnQ8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+U2hvdyBmcm9tIFJpZ2h0PC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS10b3BcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5TaG93IGZyb20gVG9wPC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1ib3R0b21cIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5TaG93IGZyb20gQm90dG9tPC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPlJldmVhbDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWxcIj5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1sZWZ0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+UmV2ZWFsIGZyb20gTGVmdDwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlJldmVhbCBmcm9tIFJpZ2h0PC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXRvcFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlJldmVhbCBmcm9tIFRvcDwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1ib3R0b21cIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5SZXZlYWwgZnJvbSBCb3R0b208L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iXX0=
