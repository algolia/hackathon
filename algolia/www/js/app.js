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
        React.createElement('img', { src: 'img/logo-mark.svg', alt: 'TouchstoneJS', className: 'demo-brand', width: '80', height: '80' }),
        React.createElement(
          'h1',
          null,
          'TouchstoneJS',
          React.createElement(
            'small',
            null,
            ' demo'
          )
        ),
        React.createElement(
          'p',
          null,
          'React.js powered UI framework for developing beautiful hybrid mobile apps.'
        ),
        React.createElement(
          'ul',
          { className: 'demo-links' },
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'https://twitter.com/touchstonejs', target: '_blank', className: 'ion-social-twitter' },
              'Twitter'
            )
          ),
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'https://github.com/jedwatson/touchstonejs', target: '_blank', className: 'ion-social-github' },
              'Github'
            )
          ),
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'http://touchstonejs.io', target: '_blank', className: 'ion-map' },
              'Roadmap'
            )
          )
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
				React.createElement(UI.HeaderbarButton, { showView: 'home', viewTransition: 'reveal-from-right', label: 'Back', icon: 'ion-chevron-left' })
			),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Inputs'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(UI.Input, { placeholder: 'Default' }),
					React.createElement(UI.Input, { defaultValue: 'With Value', placeholder: 'Placeholder' }),
					React.createElement(UI.Textarea, { defaultValue: 'Longtext is good for bios etc.', placeholder: 'Longtext' })
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Labelled Inputs'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(UI.LabelInput, { type: 'email', label: 'Email', placeholder: 'your.name@example.com' }),
					React.createElement(UI.LabelInput, { type: 'url', label: 'URL', placeholder: 'http://www.yourwebsite.com' }),
					React.createElement(UI.LabelInput, { noedit: true, label: 'No Edit', value: 'Un-editable, scrollable, selectable content' }),
					React.createElement(UI.LabelSelect, { label: 'Flavour', value: this.state.flavour, onChange: this.handleFlavourChange, options: [{ label: 'Vanilla', value: 'vanilla' }, { label: 'Chocolate', value: 'chocolate' }, { label: 'Caramel', value: 'caramel' }, { label: 'Strawberry', value: 'strawberry' }, { label: 'Banana', value: 'banana' }, { label: 'Lemon', value: 'lemon' }, { label: 'Pastaccio', value: 'pastaccio' }] }),
					React.createElement(
						'div',
						{ className: 'list-item field-item' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							React.createElement(
								'div',
								{ className: 'field-label' },
								'Switch'
							),
							React.createElement(UI.Switch, { onTap: this.handleSwitch.bind(this, 'verifiedCreditCard'), on: this.state.verifiedCreditCard })
						)
					)
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
				{ type: 'default', label: 'Complex List' },
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
					React.createElement(UI.LabelInput, { label: 'Name', value: [this.props.user.name.first, this.props.user.name.last].join(' '), placeholder: 'Full name', first: true }),
					React.createElement(UI.LabelInput, { label: 'Location', value: this.props.user.location, placeholder: 'Suburb, Country' }),
					React.createElement(UI.LabelInput, { label: 'Joined', value: this.props.user.joinedDate, placeholder: 'Date' }),
					React.createElement(UI.LabelTextarea, { label: 'Bio', value: this.state.bioValue, placeholder: '(required)', onChange: this.handleBioInput })
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Tappable,
						{ onTap: this.showFlavourList, className: 'list-item is-first', component: 'div' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Favourite Icecream',
							React.createElement(
								'div',
								{ className: 'item-note default' },
								React.createElement(
									'div',
									{ className: 'item-note-label' },
									this.props.user.flavour
								),
								React.createElement('div', { className: 'item-note-icon ion-chevron-right' })
							)
						)
					)
				),
				React.createElement(
					Tappable,
					{ onTap: this.flashAlert.bind(this, 'You clicked the Primary Button.'), className: 'panel-button primary', component: 'button' },
					'Primary Button'
				),
				React.createElement(
					Tappable,
					{ onTap: this.flashAlert.bind(this, 'You clicked the Default Button.'), className: 'panel-button', component: 'button' },
					'Default Button'
				),
				React.createElement(
					Tappable,
					{ onTap: this.flashAlert.bind(this, 'You clicked the Danger Button.'), className: 'panel-button danger', component: 'button' },
					'Danger Button'
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

var Timers = require('react-timers');

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Navigation, Timers()],

	getInitialState: function getInitialState() {
		return {
			popup: {
				visible: false
			}
		};
	},
	showLoadingPopup: function showLoadingPopup() {
		this.setState({
			popup: {
				visible: true,
				loading: true,
				header: 'Loading',
				iconName: 'ion-load-c',
				iconType: 'default'
			}
		});

		var self = this;

		this.setTimeout(function () {
			self.setState({
				popup: {
					visible: true,
					loading: false,
					header: 'Done!',
					iconName: 'ion-ios7-checkmark',
					iconType: 'success'
				}
			});
		}, 2000);

		this.setTimeout(function () {
			self.setState({
				popup: {
					visible: false
				}
			});
		}, 3000);
	},

	render: function render() {
		return React.createElement(
			UI.View,
			null,
			React.createElement(UI.Headerbar, { type: 'default', label: 'TouchstoneJS' }),
			React.createElement(
				UI.ViewContent,
				{ grow: true, scrollable: true },
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Bars'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ component: 'div', to: 'component-headerbar', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Header Bar'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-headerbar-search', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Header Bar Search'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-alertbar', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Alert Bar'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-footerbar', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Footer Bar'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Lists'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ component: 'div', to: 'component-simple-list', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Simple List'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-complex-list', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Complex List'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'UI Elements'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ component: 'div', to: 'component-toggle', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Toggle'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-form', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Form Fields'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-passcode', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Passcode / Keypad'
						)
					),
					React.createElement(
						Tappable,
						{ component: 'div', onTap: this.showLoadingPopup, className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'Loading Spinner'
						)
					)
				),
				React.createElement(
					'div',
					{ className: 'panel-header text-caps' },
					'Application State'
				),
				React.createElement(
					'div',
					{ className: 'panel' },
					React.createElement(
						Link,
						{ component: 'div', to: 'transitions', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'View Transitions'
						)
					),
					React.createElement(
						Link,
						{ component: 'div', to: 'component-feedback', viewTransition: 'show-from-right', className: 'list-item is-tappable' },
						React.createElement(
							'div',
							{ className: 'item-inner' },
							'View Feedback'
						)
					)
				)
			)
		);
	}
});
/* This is covered in other components
<Link component="div" to="component-categorised-list" viewTransition="show-from-right" className="list-item is-tappable">
<div className="item-inner">Categorised List</div>
</Link>*/

},{"react":undefined,"react-tappable":2,"react-timers":3,"touchstonejs":4}],56:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMtdGFza3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jbGFzc25hbWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlYWN0LXRhcHBhYmxlL2xpYi9UYXBwYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC10aW1lcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29tcG9uZW50cy9MaW5rLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29uc3RhbnRzL3RyYW5zaXRpb24ta2V5cy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2NyZWF0ZUFwcC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2ljb25zL2RlbGV0ZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL21peGlucy9OYXZpZ2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQWN0aW9uQnV0dG9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQWN0aW9uQnV0dG9ucy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0FsZXJ0YmFyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvRmVlZGJhY2suanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Gb290ZXJiYXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Gb290ZXJiYXJCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9IZWFkZXJiYXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9IZWFkZXJiYXJCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1NZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1Ob3RlLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvS2V5cGFkLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvS2V5cGFkQnV0dG9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxJbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xhYmVsU2VsZWN0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxUZXh0YXJlYS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xvYWRpbmdCdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Nb2RhbC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1Bhc3Njb2RlLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvUmFkaW9MaXN0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvU3dpdGNoLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvVGV4dGFyZWEuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Ub2dnbGUuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9WaWV3LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvVmlld0NvbnRlbnQuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbm9kZV9tb2R1bGVzL2JsYWNrbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbm9kZV9tb2R1bGVzL3h0ZW5kL211dGFibGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvZGF0YS9tb250aHMuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvZGF0YS9wZW9wbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvYXBwLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL2NvbmZpZy5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWFjdGlvbi5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWFsZXJ0LmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC9iYXItZm9vdGVyLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC9iYXItaGVhZGVyLXNlYXJjaC5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvYmFyLWhlYWRlci5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvZmVlZGJhY2suanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2Zvcm0uanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2xpc3QtY2F0ZWdvcmlzZWQuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L2xpc3QtY29tcGxleC5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9jb21wb25lbnQvbGlzdC1zaW1wbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvY29tcG9uZW50L3Bhc3Njb2RlLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL2NvbXBvbmVudC90b2dnbGUuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvZGV0YWlscy5qcyIsIi9Vc2Vycy9TaGlwb3cvR2l0L2hhY2thdGhvbi9hbGdvbGlhL3NyYy9qcy92aWV3cy9ob21lLmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL3JhZGlvLWxpc3QuanMiLCIvVXNlcnMvU2hpcG93L0dpdC9oYWNrYXRob24vYWxnb2xpYS9zcmMvanMvdmlld3MvdHJhbnNpdGlvbnMtdGFyZ2V0LmpzIiwiL1VzZXJzL1NoaXBvdy9HaXQvaGFja2F0aG9uL2FsZ29saWEvc3JjL2pzL3ZpZXdzL3RyYW5zaXRpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNmQSxNQUFNLENBQUMsT0FBTyxHQUFHLENBQ2hCLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBSSxNQUFNLEVBQUUsSUFBSSxFQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFDdkQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFLLE1BQU0sRUFBRSxHQUFHLEVBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUN2RCxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUksTUFBTSxFQUFFLEdBQUcsRUFBSSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQ3ZELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBTyxNQUFNLEVBQUUsR0FBRyxFQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFDdkQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFPLE1BQU0sRUFBRSxHQUFHLEVBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUN2RCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQVMsTUFBTSxFQUFFLEdBQUcsRUFBSSxNQUFNLEVB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RUFBQyxTQUFTLEVBQUMsdUJBQXVCLEVBQUMsU0FBUyxFQUFDLEtBQUs7TUFBQzs7U0FBSyxTQUFTLEVBQUMsWUFBWTs7T0FBeUI7TUFBTztLQUMxSztJQUNVO0dBQ1IsQ0FDVDtFQUNGO0NBQ0QsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICBDb3B5cmlnaHQgKGMpIDIwMTUgSmVkIFdhdHNvbi5cbiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlIChNSVQpLCBzZWVcbiAgaHR0cDovL2plZHdhdHNvbi5naXRodWIuaW8vY2xhc3NuYW1lc1xuKi9cblxuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGZ1bmN0aW9uIGNsYXNzTmFtZXMgKCkge1xuXG5cdFx0dmFyIGNsYXNzZXMgPSAnJztcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgYXJnID0gYXJndW1lbnRzW2ldO1xuXHRcdFx0aWYgKCFhcmcpIGNvbnRpbnVlO1xuXG5cdFx0XHR2YXIgYXJnVHlwZSA9IHR5cGVvZiBhcmc7XG5cblx0XHRcdGlmICgnc3RyaW5nJyA9PT0gYXJnVHlwZSB8fCAnbnVtYmVyJyA9PT0gYXJnVHlwZSkge1xuXHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGFyZztcblxuXHRcdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFyZykpIHtcblx0XHRcdFx0Y2xhc3NlcyArPSAnICcgKyBjbGFzc05hbWVzLmFwcGx5KG51bGwsIGFyZyk7XG5cblx0XHRcdH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IGFyZ1R5cGUpIHtcblx0XHRcdFx0Zm9yICh2YXIga2V5IGluIGFyZykge1xuXHRcdFx0XHRcdGlmIChhcmcuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBhcmdba2V5XSkge1xuXHRcdFx0XHRcdFx0Y2xhc3NlcyArPSAnICcgKyBrZXk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNsYXNzZXMuc3Vic3RyKDEpO1xuXHR9XG5cblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT09ICdvYmplY3QnICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG5cdFx0ZGVmaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBjbGFzc05hbWVzO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBjbGFzc05hbWVzO1xuXHR9IGVsc2Uge1xuXHRcdHdpbmRvdy5jbGFzc05hbWVzID0gY2xhc3NOYW1lcztcblx0fVxuXG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG4vLyBFbmFibGUgUmVhY3QgVG91Y2ggRXZlbnRzXG5SZWFjdC5pbml0aWFsaXplVG91Y2hFdmVudHModHJ1ZSk7XG5cbmZ1bmN0aW9uIGdldFRvdWNoUHJvcHModG91Y2gpIHtcblx0aWYgKCF0b3VjaCkgcmV0dXJuIHt9O1xuXHRyZXR1cm4ge1xuXHRcdHBhZ2VYOiB0b3VjaC5wYWdlWCxcblx0XHRwYWdlWTogdG91Y2gucGFnZVksXG5cdFx0Y2xpZW50WDogdG91Y2guY2xpZW50WCxcblx0XHRjbGllbnRZOiB0b3VjaC5jbGllbnRZXG5cdH07XG59XG5cbmZ1bmN0aW9uIGlzRGF0YU9yQXJpYVByb3Aoa2V5KSB7XG5cdHJldHVybiBrZXkuaW5kZXhPZignZGF0YS0nKSA9PT0gMCB8fCBrZXkuaW5kZXhPZignYXJpYS0nKSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gZ2V0UGluY2hQcm9wcyh0b3VjaGVzKSB7XG5cdHJldHVybiB7XG5cdFx0dG91Y2hlczogQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKHRvdWNoZXMsIGZ1bmN0aW9uIGNvcHlUb3VjaCh0b3VjaCkge1xuXHRcdFx0cmV0dXJuIHsgaWRlbnRpZmllcjogdG91Y2guaWRlbnRpZmllciwgcGFnZVg6IHRvdWNoLnBhZ2VYLCBwYWdlWTogdG91Y2gucGFnZVkgfTtcblx0XHR9KSxcblx0XHRjZW50ZXI6IHsgeDogKHRvdWNoZXNbMF0ucGFnZVggKyB0b3VjaGVzWzFdLnBhZ2VYKSAvIDIsIHk6ICh0b3VjaGVzWzBdLnBhZ2VZICsgdG91Y2hlc1sxXS5wYWdlWSkgLyAyIH0sXG5cdFx0YW5nbGU6IE1hdGguYXRhbigpICogKHRvdWNoZXNbMV0ucGFnZVkgLSB0b3VjaGVzWzBdLnBhZ2VZKSAvICh0b3VjaGVzWzFdLnBhZ2VYIC0gdG91Y2hlc1swXS5wYWdlWCkgKiAxODAgLyBNYXRoLlBJLFxuXHRcdGRpc3RhbmNlOiBNYXRoLnNxcnQoTWF0aC5wb3coTWF0aC5hYnModG91Y2hlc1sxXS5wYWdlWCAtIHRvdWNoZXNbMF0ucGFnZVgpLCAyKSArIE1hdGgucG93KE1hdGguYWJzKHRvdWNoZXNbMV0ucGFnZVkgLSB0b3VjaGVzWzBdLnBhZ2VZKSwgMikpXG5cdH07XG59XG5cbi8qKlxuICogVGFwcGFibGUgTWl4aW5cbiAqID09PT09PT09PT09PT09XG4gKi9cblxudmFyIE1peGluID0ge1xuXHRwcm9wVHlwZXM6IHtcblx0XHRtb3ZlVGhyZXNob2xkOiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBwaXhlbHMgdG8gbW92ZSBiZWZvcmUgY2FuY2VsbGluZyB0YXBcblx0XHRhY3RpdmVEZWxheTogUmVhY3QuUHJvcFR5cGVzLm51bWJlciwgLy8gbXMgdG8gd2FpdCBiZWZvcmUgYWRkaW5nIHRoZSBgLWFjdGl2ZWAgY2xhc3Ncblx0XHRwcmVzc0RlbGF5OiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBtcyB0byB3YWl0IGJlZm9yZSBkZXRlY3RpbmcgYSBwcmVzc1xuXHRcdHByZXNzTW92ZVRocmVzaG9sZDogUmVhY3QuUHJvcFR5cGVzLm51bWJlciwgLy8gcGl4ZWxzIHRvIG1vdmUgYmVmb3JlIGNhbmNlbGxpbmcgcHJlc3Ncblx0XHRwcmV2ZW50RGVmYXVsdDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsIC8vIHdoZXRoZXIgdG8gcHJldmVudERlZmF1bHQgb24gYWxsIGV2ZW50c1xuXHRcdHN0b3BQcm9wYWdhdGlvbjogUmVhY3QuUHJvcFR5cGVzLmJvb2wsIC8vIHdoZXRoZXIgdG8gc3RvcFByb3BhZ2F0aW9uIG9uIGFsbCBldmVudHNcblxuXHRcdG9uVGFwOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgd2hlbiBhIHRhcCBpcyBkZXRlY3RlZFxuXHRcdG9uUHJlc3M6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBmaXJlcyB3aGVuIGEgcHJlc3MgaXMgZGV0ZWN0ZWRcblx0XHRvblRvdWNoU3RhcnQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBwYXNzLXRocm91Z2ggdG91Y2ggZXZlbnRcblx0XHRvblRvdWNoTW92ZTogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCB0b3VjaCBldmVudFxuXHRcdG9uVG91Y2hFbmQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBwYXNzLXRocm91Z2ggdG91Y2ggZXZlbnRcblx0XHRvbk1vdXNlRG93bjogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXHRcdG9uTW91c2VVcDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXHRcdG9uTW91c2VNb3ZlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIG1vdXNlIGV2ZW50XG5cdFx0b25Nb3VzZU91dDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXG5cdFx0b25QaW5jaFN0YXJ0OiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgd2hlbiBhIHBpbmNoIGdlc3R1cmUgaXMgc3RhcnRlZFxuXHRcdG9uUGluY2hNb3ZlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgb24gZXZlcnkgdG91Y2gtbW92ZSB3aGVuIGEgcGluY2ggYWN0aW9uIGlzIGFjdGl2ZVxuXHRcdG9uUGluY2hFbmQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jIC8vIGZpcmVzIHdoZW4gYSBwaW5jaCBhY3Rpb24gZW5kc1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhY3RpdmVEZWxheTogMCxcblx0XHRcdG1vdmVUaHJlc2hvbGQ6IDEwMCxcblx0XHRcdHByZXNzRGVsYXk6IDEwMDAsXG5cdFx0XHRwcmVzc01vdmVUaHJlc2hvbGQ6IDVcblx0XHR9O1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRpc0FjdGl2ZTogZmFsc2UsXG5cdFx0XHR0b3VjaEFjdGl2ZTogZmFsc2UsXG5cdFx0XHRwaW5jaEFjdGl2ZTogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNsZWFudXBTY3JvbGxEZXRlY3Rpb24oKTtcblx0XHR0aGlzLmNhbmNlbFByZXNzRGV0ZWN0aW9uKCk7XG5cdFx0dGhpcy5jbGVhckFjdGl2ZVRpbWVvdXQoKTtcblx0fSxcblxuXHRwcm9jZXNzRXZlbnQ6IGZ1bmN0aW9uIHByb2Nlc3NFdmVudChldmVudCkge1xuXHRcdGlmICh0aGlzLnByb3BzLnByZXZlbnREZWZhdWx0KSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGlmICh0aGlzLnByb3BzLnN0b3BQcm9wYWdhdGlvbikgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH0sXG5cblx0b25Ub3VjaFN0YXJ0OiBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5wcm9wcy5vblRvdWNoU3RhcnQgJiYgdGhpcy5wcm9wcy5vblRvdWNoU3RhcnQoZXZlbnQpID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgPSB0cnVlO1xuXHRcdGlmIChldmVudC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGhpcy5faW5pdGlhbFRvdWNoID0gdGhpcy5fbGFzdFRvdWNoID0gZ2V0VG91Y2hQcm9wcyhldmVudC50b3VjaGVzWzBdKTtcblx0XHRcdHRoaXMuaW5pdFNjcm9sbERldGVjdGlvbigpO1xuXHRcdFx0dGhpcy5pbml0UHJlc3NEZXRlY3Rpb24oZXZlbnQsIHRoaXMuZW5kVG91Y2gpO1xuXHRcdFx0dGhpcy5fYWN0aXZlVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5tYWtlQWN0aXZlLCB0aGlzLnByb3BzLmFjdGl2ZURlbGF5KTtcblx0XHR9IGVsc2UgaWYgKCh0aGlzLnByb3BzLm9uUGluY2hTdGFydCB8fCB0aGlzLnByb3BzLm9uUGluY2hNb3ZlIHx8IHRoaXMucHJvcHMub25QaW5jaEVuZCkgJiYgZXZlbnQudG91Y2hlcy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMub25QaW5jaFN0YXJ0KGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cblx0bWFrZUFjdGl2ZTogZnVuY3Rpb24gbWFrZUFjdGl2ZSgpIHtcblx0XHRpZiAoIXRoaXMuaXNNb3VudGVkKCkpIHJldHVybjtcblx0XHR0aGlzLmNsZWFyQWN0aXZlVGltZW91dCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IHRydWVcblx0XHR9KTtcblx0fSxcblxuXHRjbGVhckFjdGl2ZVRpbWVvdXQ6IGZ1bmN0aW9uIGNsZWFyQWN0aXZlVGltZW91dCgpIHtcblx0XHRjbGVhclRpbWVvdXQodGhpcy5fYWN0aXZlVGltZW91dCk7XG5cdFx0dGhpcy5fYWN0aXZlVGltZW91dCA9IGZhbHNlO1xuXHR9LFxuXG5cdG9uUGluY2hTdGFydDogZnVuY3Rpb24gb25QaW5jaFN0YXJ0KGV2ZW50KSB7XG5cdFx0Ly8gaW4gY2FzZSB0aGUgdHdvIHRvdWNoZXMgZGlkbid0IHN0YXJ0IGV4YWN0bHkgYXQgdGhlIHNhbWUgdGltZVxuXHRcdGlmICh0aGlzLl9pbml0aWFsVG91Y2gpIHtcblx0XHRcdHRoaXMuZW5kVG91Y2goKTtcblx0XHR9XG5cdFx0dmFyIHRvdWNoZXMgPSBldmVudC50b3VjaGVzO1xuXHRcdHRoaXMuX2luaXRpYWxQaW5jaCA9IGdldFBpbmNoUHJvcHModG91Y2hlcyk7XG5cdFx0dGhpcy5faW5pdGlhbFBpbmNoID0gX2V4dGVuZHModGhpcy5faW5pdGlhbFBpbmNoLCB7XG5cdFx0XHRkaXNwbGFjZW1lbnQ6IHsgeDogMCwgeTogMCB9LFxuXHRcdFx0ZGlzcGxhY2VtZW50VmVsb2NpdHk6IHsgeDogMCwgeTogMCB9LFxuXHRcdFx0cm90YXRpb246IDAsXG5cdFx0XHRyb3RhdGlvblZlbG9jaXR5OiAwLFxuXHRcdFx0em9vbTogMSxcblx0XHRcdHpvb21WZWxvY2l0eTogMCxcblx0XHRcdHRpbWU6IERhdGUubm93KClcblx0XHR9KTtcblx0XHR0aGlzLl9sYXN0UGluY2ggPSB0aGlzLl9pbml0aWFsUGluY2g7XG5cdFx0dGhpcy5wcm9wcy5vblBpbmNoU3RhcnQgJiYgdGhpcy5wcm9wcy5vblBpbmNoU3RhcnQodGhpcy5faW5pdGlhbFBpbmNoLCBldmVudCk7XG5cdH0sXG5cblx0b25QaW5jaE1vdmU6IGZ1bmN0aW9uIG9uUGluY2hNb3ZlKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5lbmRUb3VjaCgpO1xuXHRcdH1cblx0XHR2YXIgdG91Y2hlcyA9IGV2ZW50LnRvdWNoZXM7XG5cdFx0aWYgKHRvdWNoZXMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5vblBpbmNoRW5kKGV2ZW50KSAvLyBiYWlsIG91dCBiZWZvcmUgZGlzYXN0ZXJcblx0XHRcdDtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudFBpbmNoID0gdG91Y2hlc1swXS5pZGVudGlmaWVyID09PSB0aGlzLl9pbml0aWFsUGluY2gudG91Y2hlc1swXS5pZGVudGlmaWVyICYmIHRvdWNoZXNbMV0uaWRlbnRpZmllciA9PT0gdGhpcy5faW5pdGlhbFBpbmNoLnRvdWNoZXNbMV0uaWRlbnRpZmllciA/IGdldFBpbmNoUHJvcHModG91Y2hlcykgLy8gdGhlIHRvdWNoZXMgYXJlIGluIHRoZSBjb3JyZWN0IG9yZGVyXG5cdFx0OiB0b3VjaGVzWzFdLmlkZW50aWZpZXIgPT09IHRoaXMuX2luaXRpYWxQaW5jaC50b3VjaGVzWzBdLmlkZW50aWZpZXIgJiYgdG91Y2hlc1swXS5pZGVudGlmaWVyID09PSB0aGlzLl9pbml0aWFsUGluY2gudG91Y2hlc1sxXS5pZGVudGlmaWVyID8gZ2V0UGluY2hQcm9wcyh0b3VjaGVzLnJldmVyc2UoKSkgLy8gdGhlIHRvdWNoZXMgaGF2ZSBzb21laG93IGNoYW5nZWQgb3JkZXJcblx0XHQ6IGdldFBpbmNoUHJvcHModG91Y2hlcyk7IC8vIHNvbWV0aGluZyBpcyB3cm9uZywgYnV0IHdlIHN0aWxsIGhhdmUgdHdvIHRvdWNoLXBvaW50cywgc28gd2UgdHJ5IG5vdCB0byBmYWlsXG5cblx0XHRjdXJyZW50UGluY2guZGlzcGxhY2VtZW50ID0ge1xuXHRcdFx0eDogY3VycmVudFBpbmNoLmNlbnRlci54IC0gdGhpcy5faW5pdGlhbFBpbmNoLmNlbnRlci54LFxuXHRcdFx0eTogY3VycmVudFBpbmNoLmNlbnRlci55IC0gdGhpcy5faW5pdGlhbFBpbmNoLmNlbnRlci55XG5cdFx0fTtcblxuXHRcdGN1cnJlbnRQaW5jaC50aW1lID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgdGltZVNpbmNlTGFzdFBpbmNoID0gY3VycmVudFBpbmNoLnRpbWUgLSB0aGlzLl9sYXN0UGluY2gudGltZTtcblxuXHRcdGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnRWZWxvY2l0eSA9IHtcblx0XHRcdHg6IChjdXJyZW50UGluY2guZGlzcGxhY2VtZW50LnggLSB0aGlzLl9sYXN0UGluY2guZGlzcGxhY2VtZW50LngpIC8gdGltZVNpbmNlTGFzdFBpbmNoLFxuXHRcdFx0eTogKGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnQueSAtIHRoaXMuX2xhc3RQaW5jaC5kaXNwbGFjZW1lbnQueSkgLyB0aW1lU2luY2VMYXN0UGluY2hcblx0XHR9O1xuXG5cdFx0Y3VycmVudFBpbmNoLnJvdGF0aW9uID0gY3VycmVudFBpbmNoLmFuZ2xlIC0gdGhpcy5faW5pdGlhbFBpbmNoLmFuZ2xlO1xuXHRcdGN1cnJlbnRQaW5jaC5yb3RhdGlvblZlbG9jaXR5ID0gY3VycmVudFBpbmNoLnJvdGF0aW9uIC0gdGhpcy5fbGFzdFBpbmNoLnJvdGF0aW9uIC8gdGltZVNpbmNlTGFzdFBpbmNoO1xuXG5cdFx0Y3VycmVudFBpbmNoLnpvb20gPSBjdXJyZW50UGluY2guZGlzdGFuY2UgLyB0aGlzLl9pbml0aWFsUGluY2guZGlzdGFuY2U7XG5cdFx0Y3VycmVudFBpbmNoLnpvb21WZWxvY2l0eSA9IChjdXJyZW50UGluY2guem9vbSAtIHRoaXMuX2xhc3RQaW5jaC56b29tKSAvIHRpbWVTaW5jZUxhc3RQaW5jaDtcblxuXHRcdHRoaXMucHJvcHMub25QaW5jaE1vdmUgJiYgdGhpcy5wcm9wcy5vblBpbmNoTW92ZShjdXJyZW50UGluY2gsIGV2ZW50KTtcblxuXHRcdHRoaXMuX2xhc3RQaW5jaCA9IGN1cnJlbnRQaW5jaDtcblx0fSxcblxuXHRvblBpbmNoRW5kOiBmdW5jdGlvbiBvblBpbmNoRW5kKGV2ZW50KSB7XG5cdFx0Ly8gVE9ETyB1c2UgaGVscGVyIHRvIG9yZGVyIHRvdWNoZXMgYnkgaWRlbnRpZmllciBhbmQgdXNlIGFjdHVhbCB2YWx1ZXMgb24gdG91Y2hFbmQuXG5cdFx0dmFyIGN1cnJlbnRQaW5jaCA9IF9leHRlbmRzKHt9LCB0aGlzLl9sYXN0UGluY2gpO1xuXHRcdGN1cnJlbnRQaW5jaC50aW1lID0gRGF0ZS5ub3coKTtcblxuXHRcdGlmIChjdXJyZW50UGluY2gudGltZSAtIHRoaXMuX2xhc3RQaW5jaC50aW1lID4gMTYpIHtcblx0XHRcdGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnRWZWxvY2l0eSA9IDA7XG5cdFx0XHRjdXJyZW50UGluY2gucm90YXRpb25WZWxvY2l0eSA9IDA7XG5cdFx0XHRjdXJyZW50UGluY2guem9vbVZlbG9jaXR5ID0gMDtcblx0XHR9XG5cblx0XHR0aGlzLnByb3BzLm9uUGluY2hFbmQgJiYgdGhpcy5wcm9wcy5vblBpbmNoRW5kKGN1cnJlbnRQaW5jaCwgZXZlbnQpO1xuXG5cdFx0dGhpcy5faW5pdGlhbFBpbmNoID0gdGhpcy5fbGFzdFBpbmNoID0gbnVsbDtcblxuXHRcdC8vIElmIG9uZSBmaW5nZXIgaXMgc3RpbGwgb24gc2NyZWVuLCBpdCBzaG91bGQgc3RhcnQgYSBuZXcgdG91Y2ggZXZlbnQgZm9yIHN3aXBpbmcgZXRjXG5cdFx0Ly8gQnV0IGl0IHNob3VsZCBuZXZlciBmaXJlIGFuIG9uVGFwIG9yIG9uUHJlc3MgZXZlbnQuXG5cdFx0Ly8gU2luY2UgdGhlcmUgaXMgbm8gc3VwcG9ydCBzd2lwZXMgeWV0LCB0aGlzIHNob3VsZCBiZSBkaXNyZWdhcmRlZCBmb3Igbm93XG5cdFx0Ly8gaWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0Ly8gXHR0aGlzLm9uVG91Y2hTdGFydChldmVudCk7XG5cdFx0Ly8gfVxuXHR9LFxuXG5cdGluaXRTY3JvbGxEZXRlY3Rpb246IGZ1bmN0aW9uIGluaXRTY3JvbGxEZXRlY3Rpb24oKSB7XG5cdFx0dGhpcy5fc2Nyb2xsUG9zID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcblx0XHR0aGlzLl9zY3JvbGxQYXJlbnRzID0gW107XG5cdFx0dGhpcy5fc2Nyb2xsUGFyZW50UG9zID0gW107XG5cdFx0dmFyIG5vZGUgPSB0aGlzLmdldERPTU5vZGUoKTtcblx0XHR3aGlsZSAobm9kZSkge1xuXHRcdFx0aWYgKG5vZGUuc2Nyb2xsSGVpZ2h0ID4gbm9kZS5vZmZzZXRIZWlnaHQgfHwgbm9kZS5zY3JvbGxXaWR0aCA+IG5vZGUub2Zmc2V0V2lkdGgpIHtcblx0XHRcdFx0dGhpcy5fc2Nyb2xsUGFyZW50cy5wdXNoKG5vZGUpO1xuXHRcdFx0XHR0aGlzLl9zY3JvbGxQYXJlbnRQb3MucHVzaChub2RlLnNjcm9sbFRvcCArIG5vZGUuc2Nyb2xsTGVmdCk7XG5cdFx0XHRcdHRoaXMuX3Njcm9sbFBvcy50b3AgKz0gbm9kZS5zY3JvbGxUb3A7XG5cdFx0XHRcdHRoaXMuX3Njcm9sbFBvcy5sZWZ0ICs9IG5vZGUuc2Nyb2xsTGVmdDtcblx0XHRcdH1cblx0XHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG5cdFx0fVxuXHR9LFxuXG5cdGNhbGN1bGF0ZU1vdmVtZW50OiBmdW5jdGlvbiBjYWxjdWxhdGVNb3ZlbWVudCh0b3VjaCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR4OiBNYXRoLmFicyh0b3VjaC5jbGllbnRYIC0gdGhpcy5faW5pdGlhbFRvdWNoLmNsaWVudFgpLFxuXHRcdFx0eTogTWF0aC5hYnModG91Y2guY2xpZW50WSAtIHRoaXMuX2luaXRpYWxUb3VjaC5jbGllbnRZKVxuXHRcdH07XG5cdH0sXG5cblx0ZGV0ZWN0U2Nyb2xsOiBmdW5jdGlvbiBkZXRlY3RTY3JvbGwoKSB7XG5cdFx0dmFyIGN1cnJlbnRTY3JvbGxQb3MgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc2Nyb2xsUGFyZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Y3VycmVudFNjcm9sbFBvcy50b3AgKz0gdGhpcy5fc2Nyb2xsUGFyZW50c1tpXS5zY3JvbGxUb3A7XG5cdFx0XHRjdXJyZW50U2Nyb2xsUG9zLmxlZnQgKz0gdGhpcy5fc2Nyb2xsUGFyZW50c1tpXS5zY3JvbGxMZWZ0O1xuXHRcdH1cblx0XHRyZXR1cm4gIShjdXJyZW50U2Nyb2xsUG9zLnRvcCA9PT0gdGhpcy5fc2Nyb2xsUG9zLnRvcCAmJiBjdXJyZW50U2Nyb2xsUG9zLmxlZnQgPT09IHRoaXMuX3Njcm9sbFBvcy5sZWZ0KTtcblx0fSxcblxuXHRjbGVhbnVwU2Nyb2xsRGV0ZWN0aW9uOiBmdW5jdGlvbiBjbGVhbnVwU2Nyb2xsRGV0ZWN0aW9uKCkge1xuXHRcdHRoaXMuX3Njcm9sbFBhcmVudHMgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5fc2Nyb2xsUG9zID0gdW5kZWZpbmVkO1xuXHR9LFxuXG5cdGluaXRQcmVzc0RldGVjdGlvbjogZnVuY3Rpb24gaW5pdFByZXNzRGV0ZWN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuXHRcdGlmICghdGhpcy5wcm9wcy5vblByZXNzKSByZXR1cm47XG5cdFx0dGhpcy5fcHJlc3NUaW1lb3V0ID0gc2V0VGltZW91dCgoZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5wcm9wcy5vblByZXNzKGV2ZW50KTtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fSkuYmluZCh0aGlzKSwgdGhpcy5wcm9wcy5wcmVzc0RlbGF5KTtcblx0fSxcblxuXHRjYW5jZWxQcmVzc0RldGVjdGlvbjogZnVuY3Rpb24gY2FuY2VsUHJlc3NEZXRlY3Rpb24oKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX3ByZXNzVGltZW91dCk7XG5cdH0sXG5cblx0b25Ub3VjaE1vdmU6IGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXG5cdFx0XHRpZiAodGhpcy5kZXRlY3RTY3JvbGwoKSkgcmV0dXJuIHRoaXMuZW5kVG91Y2goZXZlbnQpO1xuXG5cdFx0XHR0aGlzLnByb3BzLm9uVG91Y2hNb3ZlICYmIHRoaXMucHJvcHMub25Ub3VjaE1vdmUoZXZlbnQpO1xuXHRcdFx0dGhpcy5fbGFzdFRvdWNoID0gZ2V0VG91Y2hQcm9wcyhldmVudC50b3VjaGVzWzBdKTtcblx0XHRcdHZhciBtb3ZlbWVudCA9IHRoaXMuY2FsY3VsYXRlTW92ZW1lbnQodGhpcy5fbGFzdFRvdWNoKTtcblx0XHRcdGlmIChtb3ZlbWVudC54ID4gdGhpcy5wcm9wcy5wcmVzc01vdmVUaHJlc2hvbGQgfHwgbW92ZW1lbnQueSA+IHRoaXMucHJvcHMucHJlc3NNb3ZlVGhyZXNob2xkKSB7XG5cdFx0XHRcdHRoaXMuY2FuY2VsUHJlc3NEZXRlY3Rpb24oKTtcblx0XHRcdH1cblx0XHRcdGlmIChtb3ZlbWVudC54ID4gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkIHx8IG1vdmVtZW50LnkgPiB0aGlzLnByb3BzLm1vdmVUaHJlc2hvbGQpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuaXNBY3RpdmUpIHtcblx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdGlzQWN0aXZlOiBmYWxzZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuX2FjdGl2ZVRpbWVvdXQpIHtcblx0XHRcdFx0XHR0aGlzLmNsZWFyQWN0aXZlVGltZW91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUuaXNBY3RpdmUgJiYgIXRoaXMuX2FjdGl2ZVRpbWVvdXQpIHtcblx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdGlzQWN0aXZlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHRoaXMuX2luaXRpYWxQaW5jaCAmJiBldmVudC50b3VjaGVzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy5vblBpbmNoTW92ZShldmVudCk7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fSxcblxuXHRvblRvdWNoRW5kOiBmdW5jdGlvbiBvblRvdWNoRW5kKGV2ZW50KSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdGlmICh0aGlzLl9pbml0aWFsVG91Y2gpIHtcblx0XHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHRcdHZhciBhZnRlckVuZFRvdWNoO1xuXHRcdFx0dmFyIG1vdmVtZW50ID0gdGhpcy5jYWxjdWxhdGVNb3ZlbWVudCh0aGlzLl9sYXN0VG91Y2gpO1xuXHRcdFx0aWYgKG1vdmVtZW50LnggPD0gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkICYmIG1vdmVtZW50LnkgPD0gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkICYmIHRoaXMucHJvcHMub25UYXApIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0YWZ0ZXJFbmRUb3VjaCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgZmluYWxQYXJlbnRTY3JvbGxQb3MgPSBfdGhpcy5fc2Nyb2xsUGFyZW50cy5tYXAoZnVuY3Rpb24gKG5vZGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBub2RlLnNjcm9sbFRvcCArIG5vZGUuc2Nyb2xsTGVmdDtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR2YXIgc3RvcHBlZE1vbWVudHVtU2Nyb2xsID0gX3RoaXMuX3Njcm9sbFBhcmVudFBvcy5zb21lKGZ1bmN0aW9uIChlbmQsIGkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbmQgIT09IGZpbmFsUGFyZW50U2Nyb2xsUG9zW2ldO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGlmICghc3RvcHBlZE1vbWVudHVtU2Nyb2xsKSB7XG5cdFx0XHRcdFx0XHRfdGhpcy5wcm9wcy5vblRhcChldmVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5lbmRUb3VjaChldmVudCwgYWZ0ZXJFbmRUb3VjaCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLl9pbml0aWFsUGluY2ggJiYgZXZlbnQudG91Y2hlcy5sZW5ndGggKyBldmVudC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMub25QaW5jaEVuZChldmVudCk7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fSxcblxuXHRlbmRUb3VjaDogZnVuY3Rpb24gZW5kVG91Y2goZXZlbnQsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5jYW5jZWxQcmVzc0RldGVjdGlvbigpO1xuXHRcdHRoaXMuY2xlYXJBY3RpdmVUaW1lb3V0KCk7XG5cdFx0aWYgKGV2ZW50ICYmIHRoaXMucHJvcHMub25Ub3VjaEVuZCkge1xuXHRcdFx0dGhpcy5wcm9wcy5vblRvdWNoRW5kKGV2ZW50KTtcblx0XHR9XG5cdFx0dGhpcy5faW5pdGlhbFRvdWNoID0gbnVsbDtcblx0XHR0aGlzLl9sYXN0VG91Y2ggPSBudWxsO1xuXHRcdGlmICh0aGlzLnN0YXRlLmlzQWN0aXZlKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0aXNBY3RpdmU6IGZhbHNlXG5cdFx0XHR9LCBjYWxsYmFjayk7XG5cdFx0fSBlbHNlIGlmIChjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0sXG5cblx0b25Nb3VzZURvd246IGZ1bmN0aW9uIG9uTW91c2VEb3duKGV2ZW50KSB7XG5cdFx0aWYgKHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cykge1xuXHRcdFx0d2luZG93Ll9ibG9ja01vdXNlRXZlbnRzID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnByb3BzLm9uTW91c2VEb3duICYmIHRoaXMucHJvcHMub25Nb3VzZURvd24oZXZlbnQpID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR0aGlzLmluaXRQcmVzc0RldGVjdGlvbihldmVudCwgdGhpcy5lbmRNb3VzZUV2ZW50KTtcblx0XHR0aGlzLl9tb3VzZURvd24gPSB0cnVlO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IHRydWVcblx0XHR9KTtcblx0fSxcblxuXHRvbk1vdXNlTW92ZTogZnVuY3Rpb24gb25Nb3VzZU1vdmUoZXZlbnQpIHtcblx0XHRpZiAod2luZG93Ll9ibG9ja01vdXNlRXZlbnRzIHx8ICF0aGlzLl9tb3VzZURvd24pIHJldHVybjtcblx0XHR0aGlzLnByb2Nlc3NFdmVudChldmVudCk7XG5cdFx0dGhpcy5wcm9wcy5vbk1vdXNlTW92ZSAmJiB0aGlzLnByb3BzLm9uTW91c2VNb3ZlKGV2ZW50KTtcblx0fSxcblxuXHRvbk1vdXNlVXA6IGZ1bmN0aW9uIG9uTW91c2VVcChldmVudCkge1xuXHRcdGlmICh3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgfHwgIXRoaXMuX21vdXNlRG93bikgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR0aGlzLnByb3BzLm9uTW91c2VVcCAmJiB0aGlzLnByb3BzLm9uTW91c2VVcChldmVudCk7XG5cdFx0dGhpcy5wcm9wcy5vblRhcCAmJiB0aGlzLnByb3BzLm9uVGFwKGV2ZW50KTtcblx0XHR0aGlzLmVuZE1vdXNlRXZlbnQoKTtcblx0fSxcblxuXHRvbk1vdXNlT3V0OiBmdW5jdGlvbiBvbk1vdXNlT3V0KGV2ZW50KSB7XG5cdFx0aWYgKHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cyB8fCAhdGhpcy5fbW91c2VEb3duKSByZXR1cm47XG5cdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdHRoaXMucHJvcHMub25Nb3VzZU91dCAmJiB0aGlzLnByb3BzLm9uTW91c2VPdXQoZXZlbnQpO1xuXHRcdHRoaXMuZW5kTW91c2VFdmVudCgpO1xuXHR9LFxuXG5cdGVuZE1vdXNlRXZlbnQ6IGZ1bmN0aW9uIGVuZE1vdXNlRXZlbnQoKSB7XG5cdFx0dGhpcy5jYW5jZWxQcmVzc0RldGVjdGlvbigpO1xuXHRcdHRoaXMuX21vdXNlRG93biA9IGZhbHNlO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IGZhbHNlXG5cdFx0fSk7XG5cdH0sXG5cblx0dG91Y2hTdHlsZXM6IGZ1bmN0aW9uIHRvdWNoU3R5bGVzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRXZWJraXRUYXBIaWdobGlnaHRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0V2Via2l0VG91Y2hDYWxsb3V0OiAnbm9uZScsXG5cdFx0XHRXZWJraXRVc2VyU2VsZWN0OiAnbm9uZScsXG5cdFx0XHRLaHRtbFVzZXJTZWxlY3Q6ICdub25lJyxcblx0XHRcdE1velVzZXJTZWxlY3Q6ICdub25lJyxcblx0XHRcdG1zVXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0dXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9O1xuXHR9LFxuXG5cdGhhbmRsZXJzOiBmdW5jdGlvbiBoYW5kbGVycygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0b25Ub3VjaFN0YXJ0OiB0aGlzLm9uVG91Y2hTdGFydCxcblx0XHRcdG9uVG91Y2hNb3ZlOiB0aGlzLm9uVG91Y2hNb3ZlLFxuXHRcdFx0b25Ub3VjaEVuZDogdGhpcy5vblRvdWNoRW5kLFxuXHRcdFx0b25Nb3VzZURvd246IHRoaXMub25Nb3VzZURvd24sXG5cdFx0XHRvbk1vdXNlVXA6IHRoaXMub25Nb3VzZVVwLFxuXHRcdFx0b25Nb3VzZU1vdmU6IHRoaXMub25Nb3VzZU1vdmUsXG5cdFx0XHRvbk1vdXNlT3V0OiB0aGlzLm9uTW91c2VPdXRcblx0XHR9O1xuXHR9XG59O1xuXG4vKipcbiAqIFRhcHBhYmxlIENvbXBvbmVudFxuICogPT09PT09PT09PT09PT09PT09XG4gKi9cblxudmFyIENvbXBvbmVudCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRkaXNwbGF5TmFtZTogJ1RhcHBhYmxlJyxcblxuXHRtaXhpbnM6IFtNaXhpbl0sXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y29tcG9uZW50OiBSZWFjdC5Qcm9wVHlwZXMuYW55LCAvLyBjb21wb25lbnQgdG8gY3JlYXRlXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAvLyBvcHRpb25hbCBjbGFzc05hbWVcblx0XHRjbGFzc0Jhc2U6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsIC8vIGJhc2UgZm9yIGdlbmVyYXRlZCBjbGFzc05hbWVzXG5cdFx0c3R5bGU6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QsIC8vIGFkZGl0aW9uYWwgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGNvbXBvbmVudFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCAvLyBvbmx5IGFwcGxpZXMgdG8gYnV0dG9uc1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb21wb25lbnQ6ICdzcGFuJyxcblx0XHRcdGNsYXNzQmFzZTogJ1RhcHBhYmxlJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHByb3BzID0gdGhpcy5wcm9wcztcblx0XHR2YXIgY2xhc3NOYW1lID0gcHJvcHMuY2xhc3NCYXNlICsgKHRoaXMuc3RhdGUuaXNBY3RpdmUgPyAnLWFjdGl2ZScgOiAnLWluYWN0aXZlJyk7XG5cblx0XHRpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG5cdFx0XHRjbGFzc05hbWUgKz0gJyAnICsgcHJvcHMuY2xhc3NOYW1lO1xuXHRcdH1cblxuXHRcdHZhciBzdHlsZSA9IHt9O1xuXHRcdF9leHRlbmRzKHN0eWxlLCB0aGlzLnRvdWNoU3R5bGVzKCksIHByb3BzLnN0eWxlKTtcblxuXHRcdHZhciBuZXdDb21wb25lbnRQcm9wcyA9IF9leHRlbmRzKHt9LCBwcm9wcywge1xuXHRcdFx0c3R5bGU6IHN0eWxlLFxuXHRcdFx0Y2xhc3NOYW1lOiBjbGFzc05hbWUsXG5cdFx0XHRkaXNhYmxlZDogcHJvcHMuZGlzYWJsZWQsXG5cdFx0XHRoYW5kbGVyczogdGhpcy5oYW5kbGVyc1xuXHRcdH0sIHRoaXMuaGFuZGxlcnMoKSk7XG5cblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25UYXA7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUHJlc3M7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUGluY2hTdGFydDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25QaW5jaE1vdmU7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUGluY2hFbmQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm1vdmVUaHJlc2hvbGQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnByZXNzRGVsYXk7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnByZXNzTW92ZVRocmVzaG9sZDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMucHJldmVudERlZmF1bHQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnN0b3BQcm9wYWdhdGlvbjtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMuY29tcG9uZW50O1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQocHJvcHMuY29tcG9uZW50LCBuZXdDb21wb25lbnRQcm9wcywgcHJvcHMuY2hpbGRyZW4pO1xuXHR9XG59KTtcblxuQ29tcG9uZW50Lk1peGluID0gTWl4aW47XG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFRpbWVycyAoKSB7XG4gIHZhciBpbnRlcnZhbHMgPSBbXVxuICB2YXIgdGltZW91dHMgPSBbXVxuXG4gIHJldHVybiB7XG4gICAgY2xlYXJJbnRlcnZhbHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGludGVydmFscy5mb3JFYWNoKGNsZWFySW50ZXJ2YWwpXG4gICAgfSxcblxuICAgIGNsZWFyVGltZW91dHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRpbWVvdXRzLmZvckVhY2goY2xlYXJUaW1lb3V0KVxuICAgIH0sXG5cbiAgICBjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGludGVydmFscyA9IFtdXG4gICAgICB0aW1lb3V0cyA9IFtdXG4gICAgfSxcblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmNsZWFySW50ZXJ2YWxzKClcbiAgICAgIHRoaXMuY2xlYXJUaW1lb3V0cygpXG4gICAgfSxcblxuICAgIGNvdW50RG93bjogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aW1lb3V0LCBpbnRlcnZhbCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB2YXIgc2xlZXAgPSBNYXRoLm1pbih0aW1lb3V0LCBpbnRlcnZhbClcblxuICAgICAgdGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IHRpbWVvdXQgLSBzbGVlcFxuXG4gICAgICAgIGNhbGxiYWNrKHJlbWFpbmluZylcbiAgICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSByZXR1cm5cblxuICAgICAgICBzZWxmLmNvdW50RG93bihjYWxsYmFjaywgcmVtYWluaW5nLCBpbnRlcnZhbClcbiAgICAgIH0sIHNsZWVwKVxuICAgIH0sXG5cbiAgICBzZXRJbnRlcnZhbDogZnVuY3Rpb24gKGNhbGxiYWNrLCBpbnRlcnZhbCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIGludGVydmFscy5wdXNoKHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFzZWxmLmlzTW91bnRlZCgpKSByZXR1cm5cblxuICAgICAgICBjYWxsYmFjay5jYWxsKHNlbGYpXG4gICAgICB9LCBpbnRlcnZhbCkpXG4gICAgfSxcblxuICAgIHNldFRpbWVvdXQ6IGZ1bmN0aW9uIChjYWxsYmFjaywgdGltZW91dCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICAgIHRpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghc2VsZi5pc01vdW50ZWQoKSkgcmV0dXJuXG5cbiAgICAgICAgY2FsbGJhY2suY2FsbChzZWxmKVxuICAgICAgfSwgdGltZW91dCkpXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgVG91Y2hzdG9uZSA9IHtcblx0Y3JlYXRlQXBwOiByZXF1aXJlKCcuL2xpYi9jcmVhdGVBcHAnKSxcblx0TmF2aWdhdGlvbjogcmVxdWlyZSgnLi9saWIvbWl4aW5zL05hdmlnYXRpb24nKSxcblx0TGluazogcmVxdWlyZSgnLi9saWIvY29tcG9uZW50cy9MaW5rJyksXG5cdFVJOiByZXF1aXJlKCcuL2xpYi91aScpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvdWNoc3RvbmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcbnZhciBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi4vbWl4aW5zL05hdmlnYXRpb24nKTtcblxudmFyIFRSQU5TSVRJT05fS0VZUyA9IHJlcXVpcmUoJy4uL2NvbnN0YW50cy90cmFuc2l0aW9uLWtleXMnKTtcbnZhciB2YWxpZFRyYW5zaXRpb25zID0gT2JqZWN0LmtleXMoVFJBTlNJVElPTl9LRVlTKTtcblxuLyoqXG4gKiBUb3VjaHN0b25lIExpbmsgQ29tcG9uZW50XG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0ZGlzcGxheU5hbWU6ICdMaW5rJyxcblxuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHR0bzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZy5pc1JlcXVpcmVkLFxuXHRcdHBhcmFtczogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCxcblx0XHR2aWV3VHJhbnNpdGlvbjogUmVhY3QuUHJvcFR5cGVzLm9uZU9mKHZhbGlkVHJhbnNpdGlvbnMpLFxuXHRcdGNvbXBvbmVudDogUmVhY3QuUHJvcFR5cGVzLmFueSxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dmlld1RyYW5zaXRpb246ICdub25lJyxcblx0XHRcdGNvbXBvbmVudDogJ3NwYW4nXG5cdFx0fTtcblx0fSxcblxuXHRhY3Rpb246IGZ1bmN0aW9uIGFjdGlvbigpIHtcblx0XHR2YXIgcGFyYW1zID0gdGhpcy5wcm9wcy5wYXJhbXM7XG5cblx0XHRpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHBhcmFtcykge1xuXHRcdFx0cGFyYW1zID0gcGFyYW1zLmNhbGwodGhpcyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zaG93Vmlldyh0aGlzLnByb3BzLnRvLCB0aGlzLnByb3BzLnZpZXdUcmFuc2l0aW9uLCBwYXJhbXMpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLmFjdGlvbiwgY2xhc3NOYW1lOiB0aGlzLnByb3BzLmNsYXNzTmFtZSwgY29tcG9uZW50OiB0aGlzLnByb3BzLmNvbXBvbmVudCB9LFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cblxufSk7IiwiLyoqXG4gKiBWaWV3IHRyYW5zaXRpb24gYW5pbWF0aW9uc1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0J25vbmUnOiB7IGluOiBmYWxzZSwgb3V0OiBmYWxzZSB9LFxuXHQnZmFkZSc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQnZmFkZS1jb250cmFjdCc6IHsgaW46IHRydWUsIG91dDogdHJ1ZSB9LFxuXHQnZmFkZS1leHBhbmQnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3Nob3ctZnJvbS1sZWZ0JzogeyBpbjogdHJ1ZSwgb3V0OiB0cnVlIH0sXG5cdCdzaG93LWZyb20tcmlnaHQnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3Nob3ctZnJvbS10b3AnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3Nob3ctZnJvbS1ib3R0b20nOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3JldmVhbC1mcm9tLWxlZnQnOiB7IGluOiB0cnVlLCBvdXQ6IHRydWUgfSxcblx0J3JldmVhbC1mcm9tLXJpZ2h0JzogeyBpbjogdHJ1ZSwgb3V0OiB0cnVlIH0sXG5cdCdyZXZlYWwtZnJvbS10b3AnOiB7IGluOiBmYWxzZSwgb3V0OiB0cnVlIH0sXG5cdCdyZXZlYWwtZnJvbS1ib3R0b20nOiB7IGluOiBmYWxzZSwgb3V0OiB0cnVlIH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgeHRlbmQgPSByZXF1aXJlKCd4dGVuZC9tdXRhYmxlJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBVSSA9IHJlcXVpcmUoJy4vdWknKTtcblxudmFyIERFRkFVTFRfVFJBTlNJVElPTiA9ICdub25lJztcbnZhciBUUkFOU0lUSU9OUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzL3RyYW5zaXRpb24ta2V5cycpO1xuXG4vKipcbiAqIFRvdWNoc3RvbmUgQXBwXG4gKiA9PT09PT09PT09PT09PVxuICpcbiAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIGNhbGxlZCB3aXRoIHlvdXIgYXBwJ3Mgdmlld3MuXG4gKlxuICogSXQgcmV0dXJucyBhIE1peGluIHdoaWNoIHNob3VsZCBiZSBhZGRlZCB0byB5b3VyIEFwcC5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXBwKHZpZXdzKSB7XG5cdHJldHVybiB7XG5cdFx0Y29tcG9uZW50V2lsbE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsTW91bnQoKSB7XG5cdFx0XHR0aGlzLnZpZXdzID0ge307XG5cblx0XHRcdGZvciAodmFyIHZpZXdOYW1lIGluIHZpZXdzKSB7XG5cdFx0XHRcdHZhciB2aWV3ID0gdmlld3Nbdmlld05hbWVdO1xuXHRcdFx0XHR0aGlzLnZpZXdzW3ZpZXdOYW1lXSA9IFJlYWN0LmNyZWF0ZUZhY3Rvcnkodmlldyk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGNoaWxkQ29udGV4dFR5cGVzOiB7XG5cdFx0XHRjdXJyZW50VmlldzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkXG5cdFx0fSxcblxuXHRcdGdldENoaWxkQ29udGV4dDogZnVuY3Rpb24gZ2V0Q2hpbGRDb250ZXh0KCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y3VycmVudFZpZXc6IHRoaXMuc3RhdGUuY3VycmVudFZpZXcsXG5cdFx0XHRcdGFwcDogdGhpc1xuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0Z2V0Q3VycmVudFZpZXc6IGZ1bmN0aW9uIGdldEN1cnJlbnRWaWV3KCkge1xuXHRcdFx0dmFyIHZpZXdzRGF0YSA9IHt9O1xuXHRcdFx0dmlld3NEYXRhW3RoaXMuc3RhdGUuY3VycmVudFZpZXddID0gdGhpcy5nZXRWaWV3KHRoaXMuc3RhdGUuY3VycmVudFZpZXcpO1xuXHRcdFx0dmFyIHZpZXdzID0gUmVhY3QuYWRkb25zLmNyZWF0ZUZyYWdtZW50KHZpZXdzRGF0YSk7XG5cdFx0XHRyZXR1cm4gdmlld3M7XG5cdFx0fSxcblxuXHRcdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dmlld1RyYW5zaXRpb246IHRoaXMuZ2V0Vmlld1RyYW5zaXRpb24oREVGQVVMVF9UUkFOU0lUSU9OKVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0Z2V0VmlldzogZnVuY3Rpb24gZ2V0VmlldyhrZXkpIHtcblx0XHRcdHZhciB2aWV3ID0gdmlld3Nba2V5XTtcblx0XHRcdGlmICghdmlldykgcmV0dXJuIHRoaXMuZ2V0Vmlld05vdEZvdW5kKCk7XG5cblx0XHRcdHZhciBnaXZlblByb3BzID0gdGhpcy5zdGF0ZVtrZXkgKyAnX3Byb3BzJ107XG5cdFx0XHR2YXIgcHJvcHMgPSB4dGVuZCh7XG5cdFx0XHRcdGtleToga2V5LFxuXHRcdFx0XHRhcHA6IHRoaXMsXG5cdFx0XHRcdHZpZXdDbGFzc05hbWU6IHRoaXMuc3RhdGVba2V5ICsgJ19jbGFzcyddIHx8ICd2aWV3J1xuXHRcdFx0fSwgZ2l2ZW5Qcm9wcyk7XG5cblx0XHRcdGlmICh0aGlzLmdldFZpZXdQcm9wcykge1xuXHRcdFx0XHR4dGVuZChwcm9wcywgdGhpcy5nZXRWaWV3UHJvcHMoKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KHZpZXcsIHByb3BzKTtcblx0XHR9LFxuXG5cdFx0Z2V0Vmlld05vdEZvdW5kOiBmdW5jdGlvbiBnZXRWaWV3Tm90Rm91bmQoKSB7XG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0VUkuVmlldyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICd2aWV3JyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFVJLlZpZXdDb250ZW50LFxuXHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChVSS5GZWVkYmFjaywge1xuXHRcdFx0XHRcdFx0aWNvbktleTogJ2lvbi1hbGVydC1jaXJjbGVkJyxcblx0XHRcdFx0XHRcdGljb25UeXBlOiAnZGFuZ2VyJyxcblx0XHRcdFx0XHRcdHRleHQ6ICdTb3JyeSwgdGhlIHZpZXcgPHN0cm9uZz5cIicgKyB0aGlzLnN0YXRlLmN1cnJlbnRWaWV3ICsgJ1wiPC9zdHJvbmc+IGlzIG5vdCBhdmFpbGFibGUuJyxcblx0XHRcdFx0XHRcdGFjdGlvblRleHQ6ICdPa2F5LCB0YWtlIG1lIGhvbWUnLFxuXHRcdFx0XHRcdFx0YWN0aW9uRm46IHRoaXMuZ290b0RlZmF1bHRWaWV3XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0KVxuXHRcdFx0KTtcblx0XHR9LFxuXG5cdFx0Z2V0Vmlld1RyYW5zaXRpb246IGZ1bmN0aW9uIGdldFZpZXdUcmFuc2l0aW9uKGtleSkge1xuXHRcdFx0aWYgKCFUUkFOU0lUSU9OU1trZXldKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdJbnZhbGlkIFZpZXcgVHJhbnNpdGlvbjogJyArIGtleSk7XG5cdFx0XHRcdGtleSA9ICdub25lJztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHh0ZW5kKHtcblx0XHRcdFx0a2V5OiBrZXksXG5cdFx0XHRcdG5hbWU6ICd2aWV3LXRyYW5zaXRpb24tJyArIGtleSxcblx0XHRcdFx0J2luJzogZmFsc2UsXG5cdFx0XHRcdG91dDogZmFsc2Vcblx0XHRcdH0sIFRSQU5TSVRJT05TW2tleV0pO1xuXHRcdH0sXG5cblx0XHRzaG93VmlldzogZnVuY3Rpb24gc2hvd1ZpZXcoa2V5LCB0cmFuc2l0aW9uLCBwcm9wcywgc3RhdGUpIHtcblx0XHRcdGlmICh0eXBlb2YgdHJhbnNpdGlvbiA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cHJvcHMgPSB0cmFuc2l0aW9uO1xuXHRcdFx0XHR0cmFuc2l0aW9uID0gREVGQVVMVF9UUkFOU0lUSU9OO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mIHRyYW5zaXRpb24gIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdHRyYW5zaXRpb24gPSBERUZBVUxUX1RSQU5TSVRJT047XG5cdFx0XHR9XG5cblx0XHRcdGNvbnNvbGUubG9nKCdTaG93aW5nIHZpZXcgfCcgKyBrZXkgKyAnfCB3aXRoIHRyYW5zaXRpb24gfCcgKyB0cmFuc2l0aW9uICsgJ3wgYW5kIHByb3BzICcgKyBKU09OLnN0cmluZ2lmeShwcm9wcykpO1xuXG5cdFx0XHR2YXIgbmV3U3RhdGUgPSB7XG5cdFx0XHRcdGN1cnJlbnRWaWV3OiBrZXksXG5cdFx0XHRcdHByZXZpb3VzVmlldzogdGhpcy5zdGF0ZS5jdXJyZW50Vmlldyxcblx0XHRcdFx0dmlld1RyYW5zaXRpb246IHRoaXMuZ2V0Vmlld1RyYW5zaXRpb24odHJhbnNpdGlvbilcblx0XHRcdH07XG5cblx0XHRcdG5ld1N0YXRlW2tleSArICdfY2xhc3MnXSA9ICd2aWV3Jztcblx0XHRcdG5ld1N0YXRlW2tleSArICdfcHJvcHMnXSA9IHByb3BzIHx8IHt9O1xuXG5cdFx0XHR4dGVuZChuZXdTdGF0ZSwgc3RhdGUpO1xuXG5cdFx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKTtcblx0XHR9XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQXBwOyIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwidXRmLThcIj8+JyArICc8IURPQ1RZUEUgc3ZnIFBVQkxJQyBcIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOXCIgXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcIj4nICsgJzxzdmcgdmVyc2lvbj1cIjEuMVwiIGlkPVwiTGF5ZXJfMVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiB4PVwiMHB4XCIgeT1cIjBweFwiJyArICdcXHQgdmlld0JveD1cIi0yNDIgMTgzLjQgOTAgNjUuNFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IC0yNDIgMTgzLjQgOTAgNjUuNFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+JyArICc8cGF0aCBjbGFzcz1cInN2Zy1wYXRoXCIgZD1cIk0tMTY2LDE4My40SC0yMDVjLTMuOCwwLTcuNCwxLjUtMTAuMSw0LjJsLTI1LjYsMjUuNmMtMS42LDEuNi0xLjYsNC4yLDAsNS44bDI1LjYsMjUuNmMyLjcsMi43LDYuMyw0LjIsMTAuMSw0LjJoMzkuMScgKyAnXFx0YzcuOSwwLDE0LTYuNCwxNC0xNC4zdi0zNi44Qy0xNTIsMTg5LjgtMTU4LjEsMTgzLjQtMTY2LDE4My40IE0tMTY5LjgsMjI4LjRsLTQuMyw0LjNsLTEyLjMtMTIuM2wtMTIuMywxMi4zbC00LjMtNC4zbDEyLjMtMTIuMycgKyAnXFx0bC0xMi4zLTEyLjNsNC4zLTQuM2wxMi4zLDEyLjNsMTIuMy0xMi4zbDQuMyw0LjNsLTEyLjMsMTIuM0wtMTY5LjgsMjI4LjR6XCIvPicgKyAnPC9zdmc+JzsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG4vKipcbiAqIFRvdWNoc3RvbmUgTmF2aWdhdGlvbiBNaXhpblxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0ZGlzcGxheU5hbWU6ICdOYXZpZ2F0aW9uJyxcblxuXHRjb250ZXh0VHlwZXM6IHtcblx0XHRjdXJyZW50VmlldzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRhcHA6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QuaXNSZXF1aXJlZFxuXHR9LFxuXG5cdHNob3dWaWV3OiBmdW5jdGlvbiBzaG93VmlldygpIHtcblx0XHR0aGlzLmNvbnRleHQuYXBwLnNob3dWaWV3LmFwcGx5KHRoaXMuY29udGV4dC5hcHAsIGFyZ3VtZW50cyk7XG5cdH0sXG5cblx0c2hvd1ZpZXdGbjogZnVuY3Rpb24gc2hvd1ZpZXdGbigpIHtcblx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0XHRyZXR1cm4gKGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuY29udGV4dC5hcHAuc2hvd1ZpZXcuYXBwbHkodGhpcy5jb250ZXh0LmFwcCwgYXJncyk7XG5cdFx0fSkuYmluZCh0aGlzKTtcblx0fVxuXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcbnZhciBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi4vbWl4aW5zL05hdmlnYXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnQWN0aW9uQnV0dG9uJyxcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvbXBvbmVudDogJ2J1dHRvbicsXG5cdFx0XHRkaXNhYmxlZDogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0aGlzLnByb3BzLmljb24sIHtcblx0XHRcdCdhY3Rpb24tYnV0dG9uJzogdHJ1ZSxcblx0XHRcdCdkaXNhYmxlZCc6IHRoaXMucHJvcHMuZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciBsYWJlbCA9IHRoaXMucHJvcHMubGFiZWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ2FjdGlvbi1idXR0b24tbGFiZWwnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIGN1cmF0ZWQgPSBibGFja2xpc3QodGhpcy5wcm9wcywge1xuXHRcdFx0Y2hpbGRyZW46IHRydWUsXG5cdFx0XHRjbGFzc05hbWU6IHRydWUsXG5cdFx0XHRkaXNhYmxlZDogdHJ1ZSxcblx0XHRcdGljb246IHRydWUsXG5cdFx0XHRsYWJlbDogdHJ1ZSxcblx0XHRcdHNob3dWaWV3OiB0cnVlLFxuXHRcdFx0dmlld1Byb3BzOiB0cnVlLFxuXHRcdFx0dmlld1RyYW5zaXRpb246IHRydWVcblx0XHR9KTtcblxuXHRcdC8vIFRPRE86IHJlbW92ZSB0aGlzIGJlaGF2aW91ciBpbiA+MC4yLjBcblx0XHRpZiAoIWN1cmF0ZWQub25UYXAgJiYgdGhpcy5wcm9wcy5zaG93Vmlldykge1xuXHRcdFx0Y3VyYXRlZC5vblRhcCA9IHRoaXMuc2hvd1ZpZXdGbih0aGlzLnByb3BzLnNob3dWaWV3LCB0aGlzLnByb3BzLnZpZXdUcmFuc2l0aW9uLCB0aGlzLnByb3BzLnZpZXdQcm9wcyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnYWN0aW9uLWJ1dHRvbi1jZWxsJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0VGFwcGFibGUsXG5cdFx0XHRcdF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgY3VyYXRlZCksXG5cdFx0XHRcdGxhYmVsLFxuXHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnQWN0aW9uQnV0dG9ucycsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2xhc3NOYW1lOiAnJ1xuXHRcdH07XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSB0aGlzLnByb3BzLmNsYXNzTmFtZSA/IHRoaXMucHJvcHMuY2xhc3NOYW1lICsgJyBhY3Rpb24tYnV0dG9ucycgOiAnYWN0aW9uLWJ1dHRvbnMnO1xuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFZpZXdDb250ZW50ID0gcmVxdWlyZSgnLi9WaWV3Q29udGVudCcpO1xuXG52YXIgYWxlcnRUeXBlcyA9IFsnZGVmYXVsdCcsICdwcmltYXJ5JywgJ3N1Y2Nlc3MnLCAnd2FybmluZycsICdkYW5nZXInXTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnQWxlcnRiYXInLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGVpZ2h0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHB1bHNlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMub25lT2YoYWxlcnRUeXBlcylcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGhlaWdodDogJzMwcHgnLFxuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J0FsZXJ0YmFyJzogdHJ1ZSxcblx0XHRcdCdwdWxzZSc6IHRoaXMucHJvcHMucHVsc2Vcblx0XHR9KTtcblx0XHR2YXIgY29udGVudCA9IHRoaXMucHJvcHMucHVsc2UgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ0FsZXJ0YmFyLWlubmVyJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCkgOiB0aGlzLnByb3BzLmNoaWxkcmVuO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRWaWV3Q29udGVudCxcblx0XHRcdHsgaGVpZ2h0OiB0aGlzLnByb3BzLmhlaWdodCwgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdGNvbnRlbnRcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnZXhwb3J0cycsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb25LZXk6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvblR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGVhZGVyOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHN1YmhlYWRlcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0ZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGFjdGlvblRleHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0YWN0aW9uRm46IFJlYWN0LlByb3BUeXBlcy5mdW5jXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGFzc05hbWU6ICcnXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IHRoaXMucHJvcHMuY2xhc3NOYW1lID8gJ3ZpZXctZmVlZGJhY2sgJyArIHRoaXMucHJvcHMuY2xhc3NOYW1lIDogJ3ZpZXctZmVlZGJhY2snO1xuXG5cdFx0dmFyIGljb24gPSB0aGlzLnByb3BzLmljb25LZXkgPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ3ZpZXctZmVlZGJhY2staWNvbiAnICsgdGhpcy5wcm9wcy5pY29uS2V5ICsgJyAnICsgdGhpcy5wcm9wcy5pY29uVHlwZSB9KSA6IG51bGw7XG5cdFx0dmFyIGhlYWRlciA9IHRoaXMucHJvcHMuaGVhZGVyID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICd2aWV3LWZlZWRiYWNrLWhlYWRlcicgfSxcblx0XHRcdHRoaXMucHJvcHMuaGVhZGVyXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIHN1YmhlYWRlciA9IHRoaXMucHJvcHMuc3ViaGVhZGVyID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICd2aWV3LWZlZWRiYWNrLXN1YmhlYWRlcicgfSxcblx0XHRcdHRoaXMucHJvcHMuc3ViaGVhZGVyXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIHRleHQgPSB0aGlzLnByb3BzLnRleHQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ3ZpZXctZmVlZGJhY2stdGV4dCcsIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7IF9faHRtbDogdGhpcy5wcm9wcy50ZXh0IH0gfSkgOiBudWxsO1xuXHRcdHZhciBhY3Rpb24gPSB0aGlzLnByb3BzLmFjdGlvblRleHQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnByb3BzLmFjdGlvbkZuLCBjbGFzc05hbWU6ICd2aWV3LWZlZWRiYWNrLWFjdGlvbicgfSxcblx0XHRcdHRoaXMucHJvcHMuYWN0aW9uVGV4dFxuXHRcdCkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdGljb24sXG5cdFx0XHRoZWFkZXIsXG5cdFx0XHRzdWJoZWFkZXIsXG5cdFx0XHR0ZXh0LFxuXHRcdFx0YWN0aW9uXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuICAgIFZpZXdDb250ZW50ID0gcmVxdWlyZSgnLi9WaWV3Q29udGVudCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdGb290ZXJiYXInLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGVpZ2h0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGhlaWdodDogJzQ0cHgnXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J0Zvb3RlcmJhcic6IHRydWVcblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0Vmlld0NvbnRlbnQsXG5cdFx0XHR7IGhlaWdodDogdGhpcy5wcm9wcy5oZWlnaHQsIGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuICAgIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcbiAgICBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi4vbWl4aW5zL05hdmlnYXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXHRkaXNwbGF5TmFtZTogJ0FjdGlvbkJ1dHRvbicsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRjb21wb25lbnQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2hvd1ZpZXc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1RyYW5zaXRpb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1Byb3BzOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRvblRhcDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0YWN0aXZlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb21wb25lbnQ6ICdkaXYnLFxuXHRcdFx0ZGlzYWJsZWQ6IGZhbHNlLFxuXHRcdFx0YWN0aXZlOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0aGlzLnByb3BzLmljb24sIHtcblx0XHRcdCdGb290ZXJiYXItYnV0dG9uJzogdHJ1ZSxcblx0XHRcdCdhY3RpdmUnOiB0aGlzLnByb3BzLmFjdGl2ZSxcblx0XHRcdCdkaXNhYmxlZCc6IHRoaXMucHJvcHMuZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciBsYWJlbCA9IHRoaXMucHJvcHMubGFiZWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ0Zvb3RlcmJhci1idXR0b24tbGFiZWwnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIGFjdGlvbiA9IHRoaXMucHJvcHMuc2hvd1ZpZXcgPyB0aGlzLnNob3dWaWV3Rm4odGhpcy5wcm9wcy5zaG93VmlldywgdGhpcy5wcm9wcy52aWV3VHJhbnNpdGlvbiwgdGhpcy5wcm9wcy52aWV3UHJvcHMpIDogdGhpcy5wcm9wcy5vblRhcDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6IHRoaXMucHJvcHMuY29tcG9uZW50LCBvblRhcDogYWN0aW9uIH0sXG5cdFx0XHRsYWJlbCxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSGVhZGVyYmFyJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGVpZ2h0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGZpeGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ0hlYWRlcmJhcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0aGlzLnByb3BzLnR5cGUsIHsgJ2ZpeGVkJzogdGhpcy5wcm9wcy5maXhlZCB9KTtcblxuXHRcdHZhciBsYWJlbDtcblx0XHRpZiAodGhpcy5wcm9wcy5sYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsYWJlbCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ0hlYWRlcmJhci1sYWJlbCcgfSxcblx0XHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBoZWlnaHQ6IHRoaXMucHJvcHMuaGVpZ2h0LCBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlbixcblx0XHRcdGxhYmVsXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuICAgIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcbiAgICBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi4vbWl4aW5zL05hdmlnYXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSGVhZGVyYmFyQnV0dG9uJyxcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRjb21wb25lbnQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2hvd1ZpZXc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1RyYW5zaXRpb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmlld1Byb3BzOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR2aXNpYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRwcmltYXJ5OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRvblRhcDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0cG9zaXRpb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcblx0XHRcdGRpc2FibGVkOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB0aGlzLnByb3BzLnBvc2l0aW9uLCB0aGlzLnByb3BzLmljb24sIHtcblx0XHRcdCdIZWFkZXJiYXItYnV0dG9uJzogdHJ1ZSxcblx0XHRcdCdoaWRkZW4nOiAhdGhpcy5wcm9wcy52aXNpYmxlLFxuXHRcdFx0J2Rpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZCxcblx0XHRcdCdpcy1wcmltYXJ5JzogdGhpcy5wcm9wcy5wcmltYXJ5XG5cdFx0fSk7XG5cblx0XHR2YXIgbGFiZWwgPSB0aGlzLnByb3BzLmxhYmVsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdhY3Rpb24tYnV0dG9uLWxhYmVsJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdCkgOiBudWxsO1xuXHRcdHZhciBhY3Rpb24gPSB0aGlzLnByb3BzLnNob3dWaWV3ID8gdGhpcy5zaG93Vmlld0ZuKHRoaXMucHJvcHMuc2hvd1ZpZXcsIHRoaXMucHJvcHMudmlld1RyYW5zaXRpb24sIHRoaXMucHJvcHMudmlld1Byb3BzKSA6IHRoaXMucHJvcHMub25UYXA7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0eyBvblRhcDogYWN0aW9uLCBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiB0aGlzLnByb3BzLmNvbXBvbmVudCB9LFxuXHRcdFx0dGhpcy5wcm9wcy5sYWJlbCxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSW5wdXQnLFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAndGV4dCdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBkaXNhYmxlZCA9IHRoaXMucHJvcHMuZGlzYWJsZWQgfHwgdGhpcy5wcm9wcy5yZWFkb25seTtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgJ2ZpZWxkLWl0ZW0gbGlzdC1pdGVtJywge1xuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdCxcblx0XHRcdCd1LXNlbGVjdGFibGUnOiBkaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIGN1cmF0ZWQgPSBibGFja2xpc3QodGhpcy5wcm9wcywge1xuXHRcdFx0Y2xhc3NOYW1lOiB0cnVlLFxuXHRcdFx0ZGlzYWJsZWQ6IHRydWUsXG5cdFx0XHRmaXJzdDogdHJ1ZSxcblx0XHRcdHJlYWRvbmx5OiB0cnVlLFxuXHRcdFx0Y2hpbGRyZW46IHRydWVcblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWlubmVyJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdsYWJlbCcsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWNvbnRlbnQnIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnaW5wdXQnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogJ2ZpZWxkJywgZGlzYWJsZWQ6IGRpc2FibGVkIH0sIGN1cmF0ZWQpKVxuXHRcdFx0XHQpLFxuXHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtTWVkaWEnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRhdmF0YXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dGh1bWJuYWlsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0J2l0ZW0tbWVkaWEnOiB0cnVlLFxuXHRcdFx0J2lzLWljb24nOiB0aGlzLnByb3BzLmljb24sXG5cdFx0XHQnaXMtYXZhdGFyJzogdGhpcy5wcm9wcy5hdmF0YXIgfHwgdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFscyxcblx0XHRcdCdpcy10aHVtYm5haWwnOiB0aGlzLnByb3BzLnRodW1ibmFpbFxuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdC8vIG1lZGlhIHR5cGVzXG5cdFx0dmFyIGljb24gPSB0aGlzLnByb3BzLmljb24gPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ2l0ZW0taWNvbiAnICsgdGhpcy5wcm9wcy5pY29uIH0pIDogbnVsbDtcblx0XHR2YXIgYXZhdGFyID0gdGhpcy5wcm9wcy5hdmF0YXIgfHwgdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFscyA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1hdmF0YXInIH0sXG5cdFx0XHR0aGlzLnByb3BzLmF2YXRhciA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2ltZycsIHsgc3JjOiB0aGlzLnByb3BzLmF2YXRhciB9KSA6IHRoaXMucHJvcHMuYXZhdGFySW5pdGlhbHNcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgdGh1bWJuYWlsID0gdGhpcy5wcm9wcy50aHVtYm5haWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0tdGh1bWJuYWlsJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnaW1nJywgeyBzcmM6IHRoaXMucHJvcHMudGh1bWJuYWlsIH0pXG5cdFx0KSA6IG51bGw7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0aWNvbixcblx0XHRcdGF2YXRhcixcblx0XHRcdHRodW1ibmFpbFxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyksXG4gICAgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSXRlbU5vdGUnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6ICdkZWZhdWx0J1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0J2l0ZW0tbm90ZSc6IHRydWVcblx0XHR9LCB0aGlzLnByb3BzLnR5cGUsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdC8vIGVsZW1lbnRzXG5cdFx0dmFyIGxhYmVsID0gdGhpcy5wcm9wcy5sYWJlbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1ub3RlLWxhYmVsJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdCkgOiBudWxsO1xuXHRcdHZhciBpY29uID0gdGhpcy5wcm9wcy5pY29uID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdpdGVtLW5vdGUtaWNvbiAnICsgdGhpcy5wcm9wcy5pY29uIH0pIDogbnVsbDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRsYWJlbCxcblx0XHRcdGljb25cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIGljb25zID0ge1xuXHRkZWw6IHJlcXVpcmUoJy4uL2ljb25zL2RlbGV0ZScpXG59O1xuXG52YXIgVmlld0NvbnRlbnQgPSByZXF1aXJlKCcuL1ZpZXdDb250ZW50Jyk7XG52YXIgS2V5cGFkQnV0dG9uID0gcmVxdWlyZSgnLi9LZXlwYWRCdXR0b24nKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdLZXlwYWQnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRhY3Rpb246IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzdG93ZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGVuYWJsZURlbDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgLy8gb3B0aW9uczogJ2JsYWNrLXRyYW5zbHVjZW50JywgJ3doaXRlLXRyYW5zbHVjZW50J1xuXHRcdHdpbGRrZXk6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgYWN0aW9uID0gdGhpcy5wcm9wcy5hY3Rpb247XG5cdFx0dmFyIHR5cGVOYW1lID0gJ0tleXBhZC0tJyArIHRoaXMucHJvcHMudHlwZTtcblx0XHR2YXIga2V5cGFkQ2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgdHlwZU5hbWUsICdLZXlwYWQnLCB7XG5cdFx0XHQnaXMtc3Rvd2VkJzogdGhpcy5wcm9wcy5zdG93ZWRcblx0XHR9KTtcblxuXHRcdHZhciB3aWxka2V5O1xuXG5cdFx0aWYgKHRoaXMucHJvcHMud2lsZGtleSA9PT0gJ2RlY2ltYWwnKSB7XG5cdFx0XHR3aWxka2V5ID0gUmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgdmFsdWU6ICdkZWNpbWFsJywgcHJpbWFyeUxhYmVsOiAnwrcnLCBhdXg6IHRydWUgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdpbGRrZXkgPSBSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhdXg6IHRydWUsIGRpc2FibGVkOiB0cnVlIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0Vmlld0NvbnRlbnQsXG5cdFx0XHR7IGNsYXNzTmFtZToga2V5cGFkQ2xhc3NOYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEtleXBhZEJ1dHRvbiwgeyBhY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYWN0aW9uKCcxJyk7XG5cdFx0XHRcdH0sIHByaW1hcnlMYWJlbDogJzEnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignMicpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICcyJywgc2Vjb25kYXJ5TGFiZWw6ICdBQkMnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignMycpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICczJywgc2Vjb25kYXJ5TGFiZWw6ICdERUYnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignNCcpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc0Jywgc2Vjb25kYXJ5TGFiZWw6ICdHSEknIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignNScpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc1Jywgc2Vjb25kYXJ5TGFiZWw6ICdKS0wnIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignNicpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc2Jywgc2Vjb25kYXJ5TGFiZWw6ICdNTk8nIH0pLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignNycpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICc3Jywgc2Vjb25kYXJ5TGFiZWw6ICdQUVJTJyB9KSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkQnV0dG9uLCB7IGFjdGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBhY3Rpb24oJzgnKTtcblx0XHRcdFx0fSwgcHJpbWFyeUxhYmVsOiAnOCcsIHNlY29uZGFyeUxhYmVsOiAnVFVWJyB9KSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkQnV0dG9uLCB7IGFjdGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBhY3Rpb24oJzknKTtcblx0XHRcdFx0fSwgcHJpbWFyeUxhYmVsOiAnOScsIHNlY29uZGFyeUxhYmVsOiAnV1hZWicgfSksXG5cdFx0XHR3aWxka2V5LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChLZXlwYWRCdXR0b24sIHsgYWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFjdGlvbignMCcpO1xuXHRcdFx0XHR9LCBwcmltYXJ5TGFiZWw6ICcwJyB9KSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkQnV0dG9uLCB7IGFjdGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBhY3Rpb24oJ2RlbGV0ZScpO1xuXHRcdFx0XHR9LCBpY29uOiBpY29ucy5kZWwsIGRpc2FibGVkOiAhdGhpcy5wcm9wcy5lbmFibGVEZWwsIGF1eDogdHJ1ZSB9KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnS2V5cGFkQnV0dG9uJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0YWN0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0XHRhdXg6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHQnZGVsZXRlJzogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHByaW1hcnlMYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzZWNvbmRhcnlMYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2YWx1ZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhY3Rpb246IGZ1bmN0aW9uIGFjdGlvbigpIHt9LFxuXHRcdFx0Y2xhc3NOYW1lOiAnJyxcblx0XHRcdHNlY29uZGFyeUxhYmVsOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ0tleXBhZC1idXR0b24nLCB7XG5cdFx0XHQnaXMtYXV4aWxpYXJ5JzogdGhpcy5wcm9wcy5hdXggfHwgdGhpcy5wcm9wc1snZGVsZXRlJ10sXG5cdFx0XHQnZGlzYWJsZWQnOiB0aGlzLnByb3BzLmRpc2FibGVkXG5cdFx0fSk7XG5cblx0XHR2YXIgcHJpbWFyeUxhYmVsID0gdGhpcy5wcm9wcy5wcmltYXJ5TGFiZWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ0tleXBhZC1idXR0b24tcHJpbWFyeS1sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMucHJpbWFyeUxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIHNlY29uZGFyeUxhYmVsID0gdGhpcy5wcm9wcy5zZWNvbmRhcnlMYWJlbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnS2V5cGFkLWJ1dHRvbi1zZWNvbmRhcnktbGFiZWwnIH0sXG5cdFx0XHR0aGlzLnByb3BzLnNlY29uZGFyeUxhYmVsXG5cdFx0KSA6IG51bGw7XG5cdFx0dmFyIGljb24gPSB0aGlzLnByb3BzLmljb24gPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6ICdLZXlwYWQtYnV0dG9uLWljb24nLCBkYW5nZXJvdXNseVNldElubmVySFRNTDogeyBfX2h0bWw6IHRoaXMucHJvcHMuaWNvbiB9IH0pIDogbnVsbDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ0tleXBhZC1jZWxsJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0VGFwcGFibGUsXG5cdFx0XHRcdHsgb25UYXA6IHRoaXMucHJvcHMuYWN0aW9uLCBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiAnZGl2JyB9LFxuXHRcdFx0XHRpY29uLFxuXHRcdFx0XHRwcmltYXJ5TGFiZWwsXG5cdFx0XHRcdHNlY29uZGFyeUxhYmVsXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbElucHV0Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uQ2hhbmdlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHBhdHRlcm46IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cGxhY2Vob2xkZXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cmVmOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGFsaWduVG9wOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRyZWFkb25seTogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGZpcnN0OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ3RleHQnLFxuXHRcdFx0cmVhZG9ubHk6IGZhbHNlXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHtcblx0XHRcdCdsaXN0LWl0ZW0nOiB0cnVlLFxuXHRcdFx0J2ZpZWxkLWl0ZW0nOiB0cnVlLFxuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdCxcblx0XHRcdCdhbGlnbi10b3AnOiB0aGlzLnByb3BzLmFsaWduVG9wLFxuXHRcdFx0J3Utc2VsZWN0YWJsZSc6IHRoaXMucHJvcHMuZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciByZW5kZXJJbnB1dCA9IHRoaXMucHJvcHMucmVhZG9ubHkgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkIHUtc2VsZWN0YWJsZScgfSxcblx0XHRcdHRoaXMucHJvcHMudmFsdWVcblx0XHQpIDogUmVhY3QuY3JlYXRlRWxlbWVudCgnaW5wdXQnLCB7IGRpc2FibGVkOiB0aGlzLnByb3BzLmRpc2FibGVkLCB0eXBlOiB0aGlzLnByb3BzLnR5cGUsIHBhdHRlcm46IHRoaXMucHJvcHMucGF0dGVybiwgcmVmOiB0aGlzLnByb3BzLnJlZiwgdmFsdWU6IHRoaXMucHJvcHMudmFsdWUsIGRlZmF1bHRWYWx1ZTogdGhpcy5wcm9wcy5kZWZhdWx0VmFsdWUsIG9uQ2hhbmdlOiB0aGlzLnByb3BzLm9uQ2hhbmdlLCBjbGFzc05hbWU6ICdmaWVsZCcsIHBsYWNlaG9sZGVyOiB0aGlzLnByb3BzLnBsYWNlaG9sZGVyIH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnbGFiZWwnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWxhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWNvbnRyb2wnIH0sXG5cdFx0XHRcdFx0cmVuZGVySW5wdXQsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbFNlbGVjdCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRmaXJzdDogUmVhY3QuUHJvcFR5cGVzLmJvb2xcblx0fSxcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsYXNzTmFtZTogJydcblx0XHR9O1xuXHR9LFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dmFsdWU6IHRoaXMucHJvcHMudmFsdWVcblx0XHR9O1xuXHR9LFxuXHR1cGRhdGVJbnB1dFZhbHVlOiBmdW5jdGlvbiB1cGRhdGVJbnB1dFZhbHVlKGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR2YWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdC8vIFNldCBDbGFzc2VzXG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHtcblx0XHRcdCdsaXN0LWl0ZW0nOiB0cnVlLFxuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdFxuXHRcdH0pO1xuXG5cdFx0Ly8gTWFwIE9wdGlvbnNcblx0XHR2YXIgb3B0aW9ucyA9IHRoaXMucHJvcHMub3B0aW9ucy5tYXAoKGZ1bmN0aW9uIChvcCkge1xuXHRcdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdvcHRpb24nLFxuXHRcdFx0XHR7IGtleTogJ29wdGlvbi0nICsgb3AudmFsdWUsIHZhbHVlOiBvcC52YWx1ZSB9LFxuXHRcdFx0XHRvcC5sYWJlbFxuXHRcdFx0KTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2xhYmVsJyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0taW5uZXInIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZC1sYWJlbCcgfSxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0XHRcdCksXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZC1jb250cm9sJyB9LFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0XHQnc2VsZWN0Jyxcblx0XHRcdFx0XHRcdHsgdmFsdWU6IHRoaXMuc3RhdGUudmFsdWUsIG9uQ2hhbmdlOiB0aGlzLnVwZGF0ZUlucHV0VmFsdWUsIGNsYXNzTmFtZTogJ3NlbGVjdC1maWVsZCcgfSxcblx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnc2VsZWN0LWZpZWxkLWluZGljYXRvcicgfSxcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnc2VsZWN0LWZpZWxkLWluZGljYXRvci1hcnJvdycgfSlcblx0XHRcdFx0XHQpXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGFiZWxUZXh0YXJlYScsXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRyb3dzOiAzXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGRpc2FibGVkID0gdGhpcy5wcm9wcy5kaXNhYmxlZCB8fCB0aGlzLnByb3BzLnJlYWRvbmx5O1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCB7XG5cdFx0XHQnbGlzdC1pdGVtJzogdHJ1ZSxcblx0XHRcdCdmaWVsZC1pdGVtJzogdHJ1ZSxcblx0XHRcdCdhbGlnbi10b3AnOiB0cnVlLFxuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdCxcblx0XHRcdCd1LXNlbGVjdGFibGUnOiBkaXNhYmxlZFxuXHRcdH0pO1xuXG5cdFx0dmFyIGN1cmF0ZWQgPSBibGFja2xpc3QodGhpcy5wcm9wcywge1xuXHRcdFx0Y2xhc3NOYW1lOiB0cnVlLFxuXHRcdFx0ZGlzYWJsZWQ6IHRydWUsXG5cdFx0XHRmaXJzdDogdHJ1ZSxcblx0XHRcdHJlYWRvbmx5OiB0cnVlLFxuXHRcdFx0Y2hpbGRyZW46IHRydWUsXG5cdFx0XHRsYWJlbDogdHJ1ZVxuXHRcdH0pO1xuXG5cdFx0dmFyIHJlbmRlcklucHV0ID0gdGhpcy5wcm9wcy5yZWFkb25seSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQgdS1zZWxlY3RhYmxlJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy52YWx1ZVxuXHRcdCkgOiBSZWFjdC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScsIF9leHRlbmRzKHsgZGlzYWJsZWQ6IGRpc2FibGVkIH0sIGN1cmF0ZWQsIHsgY2xhc3NOYW1lOiAnZmllbGQnIH0pKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnbGFiZWwnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0taW5uZXInIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZC1sYWJlbCcgfSxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0XHRcdCksXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZC1jb250cm9sJyB9LFxuXHRcdFx0XHRcdHJlbmRlcklucHV0LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyksXG4gICAgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcbiAgICBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG4gICAgTmF2aWdhdGlvbiA9IHJlcXVpcmUoJy4uL21peGlucy9OYXZpZ2F0aW9uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0xvYWRpbmdCdXR0b24nLFxuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHNob3dWaWV3OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZpZXdUcmFuc2l0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZpZXdQcm9wczogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCxcblx0XHRjb21wb25lbnQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25UYXA6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGxvYWRpbmc6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRkaXNhYmxlZDogZmFsc2UsXG5cdFx0XHRsb2FkaW5nOiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdC8vIENsYXNzIE5hbWVcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcyh0aGlzLnByb3BzLmNsYXNzTmFtZSwgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnbG9hZGluZy1idXR0b24nOiB0cnVlLFxuXHRcdFx0J2Rpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZCxcblx0XHRcdCdpcy1sb2FkaW5nJzogdGhpcy5wcm9wcy5sb2FkaW5nXG5cdFx0fSk7XG5cblx0XHQvLyBTZXQgVmFyaWFibGVzXG5cdFx0dmFyIGxhYmVsID0gdGhpcy5wcm9wcy5sYWJlbCAmJiAhdGhpcy5wcm9wcy5sb2FkaW5nID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdsb2FkaW5nLWJ1dHRvbi10ZXh0JyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdCkgOiBudWxsO1xuXHRcdHZhciBvblRhcCA9IHRoaXMucHJvcHMuc2hvd1ZpZXcgPyB0aGlzLnNob3dWaWV3Rm4odGhpcy5wcm9wcy5zaG93VmlldywgdGhpcy5wcm9wcy52aWV3VHJhbnNpdGlvbiwgdGhpcy5wcm9wcy52aWV3UHJvcHMpIDogdGhpcy5wcm9wcy5vblRhcDtcblx0XHR2YXIgbG9hZGluZ0VsZW1lbnRzID0gdGhpcy5wcm9wcy5sb2FkaW5nID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdzcGFuJyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnbG9hZGluZy1idXR0b24taWNvbi13cmFwcGVyJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnc3BhbicsIHsgY2xhc3NOYW1lOiAnbG9hZGluZy1idXR0b24taWNvbicgfSlcblx0XHQpIDogbnVsbDtcblxuXHRcdC8vIE91dHB1dCBDb21wb25lbnRcblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiB0aGlzLnByb3BzLmNvbXBvbmVudCwgb25UYXA6IG9uVGFwIH0sXG5cdFx0XHRsb2FkaW5nRWxlbWVudHMsXG5cdFx0XHRsYWJlbCxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ01vZGFsJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHNob3dNb2RhbDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bG9hZGluZzogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bWluaTogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0aWNvbktleTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRpY29uVHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWFkZXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRwcmltYXJ5QWN0aW9uVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRwcmltYXJ5QWN0aW9uRm46IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdHNlY29uZGFyeUFjdGlvblRleHQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2Vjb25kYXJ5QWN0aW9uRm46IFJlYWN0LlByb3BUeXBlcy5mdW5jXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNob3dNb2RhbDogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzaG93TW9kYWw6IHRoaXMucHJvcHMuc2hvd01vZGFsXG5cdFx0fTtcblx0fSxcblxuXHQvLyBUT0RPOiB1c2UgUmVhY3RUcmFuc2l0aW9uR3JvdXAgdG8gaGFuZGxlIGZhZGUgaW4vb3V0XG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghc2VsZi5pc01vdW50ZWQoKSkgcmV0dXJuO1xuXG5cdFx0XHRzZWxmLnNldFN0YXRlKHsgc2hvd01vZGFsOiB0cnVlIH0pO1xuXHRcdH0sIDEpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdC8vIFNldCBjbGFzc25hbWVzXG5cdFx0dmFyIGRpYWxvZ0NsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0J01vZGFsLWRpYWxvZyc6IHRydWUsXG5cdFx0XHQnTW9kYWwtbWluaSc6IHRoaXMucHJvcHMubWluaSxcblx0XHRcdCdNb2RhbC1sb2FkaW5nJzogdGhpcy5wcm9wcy5sb2FkaW5nXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBtb2RhbENsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ01vZGFsJywge1xuXHRcdFx0J2VudGVyJzogdGhpcy5zdGF0ZS5zaG93TW9kYWxcblx0XHR9KTtcblxuXHRcdC8vIFNldCBkeW5hbWljIGNvbnRlbnRcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbktleSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnTW9kYWwtaWNvbiAnICsgdGhpcy5wcm9wcy5pY29uS2V5ICsgJyAnICsgdGhpcy5wcm9wcy5pY29uVHlwZSB9KSA6IG51bGw7XG5cdFx0dmFyIGhlYWRlciA9IHRoaXMucHJvcHMuaGVhZGVyID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdNb2RhbC1oZWFkZXInIH0sXG5cdFx0XHR0aGlzLnByb3BzLmhlYWRlclxuXHRcdCkgOiBudWxsO1xuXHRcdHZhciB0ZXh0ID0gdGhpcy5wcm9wcy50ZXh0ID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdNb2RhbC10ZXh0JywgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHsgX19odG1sOiB0aGlzLnByb3BzLnRleHQgfSB9KSA6IG51bGw7XG5cdFx0dmFyIHByaW1hcnlBY3Rpb24gPSB0aGlzLnByb3BzLnByaW1hcnlBY3Rpb25UZXh0ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0eyBvblRhcDogdGhpcy5wcm9wcy5wcmltYXJ5QWN0aW9uRm4sIGNsYXNzTmFtZTogJ01vZGFsLWFjdGlvbiBNb2RhbC1hY3Rpb24tcHJpbWFyeScgfSxcblx0XHRcdHRoaXMucHJvcHMucHJpbWFyeUFjdGlvblRleHRcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgc2Vjb25kYXJ5QWN0aW9uID0gdGhpcy5wcm9wcy5zZWNvbmRhcnlBY3Rpb25UZXh0ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0eyBvblRhcDogdGhpcy5wcm9wcy5zZWNvbmRhcnlBY3Rpb25GbiwgY2xhc3NOYW1lOiAnTW9kYWwtYWN0aW9uIE1vZGFsLWFjdGlvbi1zZWNvbmRhcnknIH0sXG5cdFx0XHR0aGlzLnByb3BzLnNlY29uZGFyeUFjdGlvblRleHRcblx0XHQpIDogbnVsbDtcblxuXHRcdHZhciBhY3Rpb25zID0gcHJpbWFyeUFjdGlvbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnTW9kYWwtYWN0aW9ucycgfSxcblx0XHRcdHNlY29uZGFyeUFjdGlvbixcblx0XHRcdHByaW1hcnlBY3Rpb25cblx0XHQpIDogbnVsbDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogbW9kYWxDbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogZGlhbG9nQ2xhc3NOYW1lIH0sXG5cdFx0XHRcdGljb24sXG5cdFx0XHRcdGhlYWRlcixcblx0XHRcdFx0dGV4dCxcblx0XHRcdFx0YWN0aW9uc1xuXHRcdFx0KSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnTW9kYWwtYmFja2Ryb3AnIH0pXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKSxcbiAgICBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuICAgIEtleXBhZCA9IHJlcXVpcmUoJy4vS2V5cGFkJyksXG4gICAgVmlld0NvbnRlbnQgPSByZXF1aXJlKCcuL1ZpZXdDb250ZW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1Bhc3Njb2RlJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0YWN0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0a2V5Ym9hcmRJc1N0b3dlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRoZWxwVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGFzc05hbWU6ICcnLFxuXHRcdFx0aGVscFRleHQ6ICdFbnRlciB5b3VyIHBhc3Njb2RlJyxcblx0XHRcdHR5cGU6ICdkZWZhdWx0J1xuXHRcdH07XG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGhlbHBUZXh0OiB0aGlzLnByb3BzLmhlbHBUZXh0LFxuXHRcdFx0a2V5Ym9hcmRJc1N0b3dlZDogdHJ1ZSxcblx0XHRcdHBhc3Njb2RlOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdC8vIHNsaWRlIHRoZSBrZXlib2FyZCB1cCBhZnRlciB0aGUgdmlldyBpcyBzaG93blxuXHRcdHNldFRpbWVvdXQoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghdGhpcy5pc01vdW50ZWQoKSkgcmV0dXJuO1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGtleWJvYXJkSXNTdG93ZWQ6IGZhbHNlXG5cdFx0XHR9KTtcblx0XHR9KS5iaW5kKHRoaXMpLCA0MDApO1xuXHR9LFxuXG5cdGhhbmRsZVBhc3Njb2RlOiBmdW5jdGlvbiBoYW5kbGVQYXNzY29kZShrZXlDb2RlKSB7XG5cblx0XHR2YXIgcGFzc2NvZGUgPSB0aGlzLnN0YXRlLnBhc3Njb2RlO1xuXG5cdFx0aWYgKGtleUNvZGUgPT09ICdkZWxldGUnKSB7XG5cdFx0XHRwYXNzY29kZSA9IHBhc3Njb2RlLnNsaWNlKDAsIC0xKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFzc2NvZGUgPSBwYXNzY29kZS5jb25jYXQoa2V5Q29kZSk7XG5cdFx0fVxuXG5cdFx0aWYgKHBhc3Njb2RlLmxlbmd0aCAhPT0gNCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRwYXNzY29kZTogcGFzc2NvZGVcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHNldFRpbWVvdXQoKGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiB0aGlzLnByb3BzLmFjdGlvbihwYXNzY29kZSk7XG5cdFx0fSkuYmluZCh0aGlzKSwgMjAwKTsgLy8gdGhlIHRyYW5zaXRpb24gdGhhdCBzdG93cyB0aGUga2V5Ym9hcmQgdGFrZXMgMTUwbXMsIGl0IGZyZWV6ZXMgaWYgaW50ZXJydXB0ZWQgYnkgdGhlIFJlYWN0Q1NTVHJhbnNpdGlvbkdyb3VwXG5cblx0XHRyZXR1cm4gdGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRwYXNzY29kZTogcGFzc2NvZGVcblx0XHR9KTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblxuXHRcdHZhciBwYXNzY29kZUNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnUGFzc2NvZGUnOiB0cnVlXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFZpZXdDb250ZW50LFxuXHRcdFx0eyBncm93OiB0cnVlIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6IHBhc3Njb2RlQ2xhc3NOYW1lIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1sYWJlbCcgfSxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmhlbHBUZXh0XG5cdFx0XHRcdCksXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1maWVsZHMnIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1maWVsZCcgfSxcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnUGFzc2NvZGUtaW5wdXQgJyArICh0aGlzLnN0YXRlLnBhc3Njb2RlLmxlbmd0aCA+IDAgPyAnaGFzLXZhbHVlJyA6ICcnKSB9KVxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1maWVsZCcgfSxcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnUGFzc2NvZGUtaW5wdXQgJyArICh0aGlzLnN0YXRlLnBhc3Njb2RlLmxlbmd0aCA+IDEgPyAnaGFzLXZhbHVlJyA6ICcnKSB9KVxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1maWVsZCcgfSxcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnUGFzc2NvZGUtaW5wdXQgJyArICh0aGlzLnN0YXRlLnBhc3Njb2RlLmxlbmd0aCA+IDIgPyAnaGFzLXZhbHVlJyA6ICcnKSB9KVxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdQYXNzY29kZS1maWVsZCcgfSxcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnUGFzc2NvZGUtaW5wdXQgJyArICh0aGlzLnN0YXRlLnBhc3Njb2RlLmxlbmd0aCA+IDMgPyAnaGFzLXZhbHVlJyA6ICcnKSB9KVxuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0KSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoS2V5cGFkLCB7IHR5cGU6IHRoaXMucHJvcHMudHlwZSwgYWN0aW9uOiB0aGlzLmhhbmRsZVBhc3Njb2RlLCBlbmFibGVEZWw6IEJvb2xlYW4odGhpcy5zdGF0ZS5wYXNzY29kZS5sZW5ndGgpLCBzdG93ZWQ6IHRoaXMuc3RhdGUua2V5Ym9hcmRJc1N0b3dlZCB9KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdGRpc3BsYXlOYW1lOiAnUmFkaW9MaXN0JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRvcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuYXJyYXksXG5cdFx0dmFsdWU6IFJlYWN0LlByb3BUeXBlcy5vbmVPZlR5cGUoW1JlYWN0LlByb3BUeXBlcy5zdHJpbmcsIFJlYWN0LlByb3BUeXBlcy5udW1iZXJdKSxcblx0XHRpY29uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uQ2hhbmdlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuY1xuXHR9LFxuXG5cdG9uQ2hhbmdlOiBmdW5jdGlvbiBvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdHRoaXMucHJvcHMub25DaGFuZ2UodmFsdWUpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXG5cdFx0dmFyIG9wdGlvbnMgPSB0aGlzLnByb3BzLm9wdGlvbnMubWFwKChmdW5jdGlvbiAob3AsIGkpIHtcblx0XHRcdHZhciBjbGFzc05hbWUgPSAnbGlzdC1pdGVtJyArIChpID09PSAwID8gJyBpcy1maXJzdCcgOiAnJyk7XG5cdFx0XHR2YXIgY2hlY2tNYXJrID0gb3AudmFsdWUgPT09IHRoaXMucHJvcHMudmFsdWUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLW5vdGUgcHJpbWFyeScgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdpdGVtLW5vdGUtaWNvbiBpb24tY2hlY2ttYXJrJyB9KVxuXHRcdFx0KSA6IG51bGw7XG5cblx0XHRcdHZhciBpY29uID0gb3AuaWNvbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ2l0ZW0tbWVkaWEnIH0sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nLCB7IGNsYXNzTmFtZTogJ2l0ZW0taWNvbiBwcmltYXJ5ICcgKyBvcC5pY29uIH0pXG5cdFx0XHQpIDogbnVsbDtcblxuXHRcdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0XHR7IGtleTogJ29wdGlvbi0nICsgaSwgb25UYXA6IHRoaXMub25DaGFuZ2UuYmluZCh0aGlzLCBvcC52YWx1ZSksIGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRcdGljb24sXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLWlubmVyJyB9LFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS10aXRsZScgfSxcblx0XHRcdFx0XHRcdG9wLmxhYmVsXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRjaGVja01hcmtcblx0XHRcdFx0KVxuXHRcdFx0KTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHRudWxsLFxuXHRcdFx0b3B0aW9uc1xuXHRcdCk7XG5cdH1cblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1N3aXRjaCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6ICdkZWZhdWx0J1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ3N3aXRjaCcsICdzd2l0Y2gtJyArIHRoaXMucHJvcHMudHlwZSwgeyAnb24nOiB0aGlzLnByb3BzLm9uIH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUYXBwYWJsZSxcblx0XHRcdHsgb25UYXA6IHRoaXMucHJvcHMub25UYXAsIGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6ICdsYWJlbCcgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ3RyYWNrJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ2hhbmRsZScgfSlcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVGV4dGFyZWEnLFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRyb3dzOiAzXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgZGlzYWJsZWQgPSB0aGlzLnByb3BzLmRpc2FibGVkIHx8IHRoaXMucHJvcHMucmVhZG9ubHk7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsICdmaWVsZC1pdGVtIGxpc3QtaXRlbScsIHtcblx0XHRcdCdpcy1maXJzdCc6IHRoaXMucHJvcHMuZmlyc3QsXG5cdFx0XHQndS1zZWxlY3RhYmxlJzogZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciBjdXJhdGVkID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsIHtcblx0XHRcdGNoaWxkcmVuOiB0cnVlLFxuXHRcdFx0Y2xhc3NOYW1lOiB0cnVlLFxuXHRcdFx0ZGlzYWJsZWQ6IHRydWUsXG5cdFx0XHRmaXJzdDogdHJ1ZSxcblx0XHRcdGlucHV0UmVmOiB0cnVlLFxuXHRcdFx0cmVhZG9ubHk6IHRydWVcblx0XHR9KTtcblx0XHRjdXJhdGVkLnJlZiA9IHRoaXMucHJvcHMuaW5wdXRSZWY7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnbGFiZWwnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1jb250ZW50JyB9LFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJywgX2V4dGVuZHMoeyBjbGFzc05hbWU6ICdmaWVsZCcsIGRpc2FibGVkOiBkaXNhYmxlZCB9LCBjdXJhdGVkKSlcblx0XHRcdFx0KSxcblx0XHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVG9nZ2xlJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWQsXG5cdFx0b3B0aW9uczogUmVhY3QuUHJvcFR5cGVzLmFycmF5LmlzUmVxdWlyZWQsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2YWx1ZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAncHJpbWFyeSdcblx0XHR9O1xuXHR9LFxuXG5cdG9uQ2hhbmdlOiBmdW5jdGlvbiBvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdHRoaXMucHJvcHMub25DaGFuZ2UodmFsdWUpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXG5cdFx0dmFyIGNvbXBvbmVudENsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J1RvZ2dsZSc6IHRydWVcblx0XHR9KTtcblxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5wcm9wcy5vcHRpb25zLm1hcCgoZnVuY3Rpb24gKG9wKSB7XG5cdFx0XHR2YXIgaXRlbUNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0XHQnVG9nZ2xlLWl0ZW0nOiB0cnVlLFxuXHRcdFx0XHQnYWN0aXZlJzogb3AudmFsdWUgPT09IHRoaXMucHJvcHMudmFsdWVcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0XHR7IGtleTogJ29wdGlvbi0nICsgb3AudmFsdWUsIG9uVGFwOiB0aGlzLm9uQ2hhbmdlLmJpbmQodGhpcywgb3AudmFsdWUpLCBjbGFzc05hbWU6IGl0ZW1DbGFzc05hbWUgfSxcblx0XHRcdFx0b3AubGFiZWxcblx0XHRcdCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNvbXBvbmVudENsYXNzTmFtZSB9LFxuXHRcdFx0b3B0aW9uc1xuXHRcdCk7XG5cdH1cblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVmlldycsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsYXNzTmFtZTogJydcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSB0aGlzLnByb3BzLmNsYXNzTmFtZSA/ICdWaWV3ICcgKyB0aGlzLnByb3BzLmNsYXNzTmFtZSA6ICdWaWV3JztcblxuXHRcdC8vIHJlYWN0IGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IGR1cGxpY2F0ZSBwcm9wZXJ0aWVzICh3aGljaCB3ZSBuZWVkIGZvciB2ZW5kb3ItcHJlZml4ZWQgdmFsdWVzKVxuXHRcdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QvaXNzdWVzLzIwMjBcblx0XHQvLyBtb3ZlZCB0aGUgZGlzcGxheSBwcm9wZXJ0aWVzIHRvIGNzcy90b3VjaHN0b25lL3ZpZXcubGVzcyB1c2luZyB0aGUgY2xhc3MgXCIuVmlld1wiXG5cblx0XHQvLyB3aGVuIHN1cHBvcnRlZCwgYXBwbHkgdGhlIGZvbGxvd2luZzpcblx0XHQvLyBkaXNwbGF5OiAnLXdlYmtpdC1ib3gnLFxuXHRcdC8vIGRpc3BsYXk6ICctd2Via2l0LWZsZXgnLFxuXHRcdC8vIGRpc3BsYXk6ICctbW96LWJveCcsXG5cdFx0Ly8gZGlzcGxheTogJy1tb3otZmxleCcsXG5cdFx0Ly8gZGlzcGxheTogJy1tcy1mbGV4Ym94Jyxcblx0XHQvLyBkaXNwbGF5OiAnZmxleCcsXG5cblx0XHR2YXIgaW5saW5lU3R5bGUgPSB7XG5cdFx0XHRXZWJraXRGbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdE1vekZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0bXNGbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdEZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0V2Via2l0QWxpZ25JdGVtczogJ3N0cmV0Y2gnLFxuXHRcdFx0TW96QWxpZ25JdGVtczogJ3N0cmV0Y2gnLFxuXHRcdFx0QWxpZ25JdGVtczogJ3N0cmV0Y2gnLFxuXHRcdFx0V2Via2l0SnVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1iZXR3ZWVuJyxcblx0XHRcdE1vekp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2VlbicsXG5cdFx0XHRKdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nXG5cdFx0fTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lLCBzdHlsZTogaW5saW5lU3R5bGUgfSxcblx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpLFxuICAgIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1ZpZXdDb250ZW50Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0aWQ6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGhlaWdodDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzY3JvbGxhYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRncm93OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGFzc05hbWU6ICcnLFxuXHRcdFx0aGVpZ2h0OiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0J1ZpZXdDb250ZW50JzogdHJ1ZSxcblx0XHRcdCdzcHJpbmd5LXNjcm9sbGluZyc6IHRoaXMucHJvcHMuc2Nyb2xsYWJsZVxuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHZhciBpbmxpbmVTdHlsZSA9IHt9O1xuXG5cdFx0Ly8gc2V0IGhlaWdodCBvbiBibG9ja3MgaWYgcHJvdmlkZWRcblx0XHRpZiAodGhpcy5wcm9wcy5oZWlnaHQpIHtcblx0XHRcdGlubGluZVN0eWxlLmhlaWdodCA9IHRoaXMucHJvcHMuaGVpZ2h0O1xuXHRcdH1cblxuXHRcdC8vIHN0cmV0Y2ggdG8gdGFrZSB1cCBzcGFjZVxuXHRcdGlmICh0aGlzLnByb3BzLmdyb3cpIHtcblx0XHRcdGlubGluZVN0eWxlLldlYmtpdEJveEZsZXggPSAnMSc7XG5cdFx0XHRpbmxpbmVTdHlsZS5XZWJraXRGbGV4ID0gJzEnO1xuXHRcdFx0aW5saW5lU3R5bGUuTW96Qm94RmxleCA9ICcxJztcblx0XHRcdGlubGluZVN0eWxlLk1vekZsZXggPSAnMSc7XG5cdFx0XHRpbmxpbmVTdHlsZS5Nc0ZsZXggPSAnMSc7XG5cdFx0XHRpbmxpbmVTdHlsZS5mbGV4ID0gJzEnO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IGJsb2NrcyB0byBiZSBzY3JvbGxhYmxlXG5cdFx0aWYgKHRoaXMucHJvcHMuc2Nyb2xsYWJsZSkge1xuXHRcdFx0aW5saW5lU3R5bGUub3ZlcmZsb3dZID0gJ2F1dG8nO1xuXHRcdFx0aW5saW5lU3R5bGUuV2Via2l0T3ZlcmZsb3dTY3JvbGxpbmcgPSAndG91Y2gnO1xuXHRcdH1cblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lLCBpZDogdGhpcy5wcm9wcy5pZCwgc3R5bGU6IGlubGluZVN0eWxlIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0QWN0aW9uQnV0dG9uOiByZXF1aXJlKCcuL0FjdGlvbkJ1dHRvbicpLFxuXHRBY3Rpb25CdXR0b25zOiByZXF1aXJlKCcuL0FjdGlvbkJ1dHRvbnMnKSxcblx0QWxlcnRiYXI6IHJlcXVpcmUoJy4vQWxlcnRiYXInKSxcblx0RmVlZGJhY2s6IHJlcXVpcmUoJy4vRmVlZGJhY2snKSxcblx0Rm9vdGVyYmFyOiByZXF1aXJlKCcuL0Zvb3RlcmJhcicpLFxuXHRGb290ZXJiYXJCdXR0b246IHJlcXVpcmUoJy4vRm9vdGVyYmFyQnV0dG9uJyksXG5cdEhlYWRlcmJhcjogcmVxdWlyZSgnLi9IZWFkZXJiYXInKSxcblx0SGVhZGVyYmFyQnV0dG9uOiByZXF1aXJlKCcuL0hlYWRlcmJhckJ1dHRvbicpLFxuXHRJbnB1dDogcmVxdWlyZSgnLi9JbnB1dCcpLFxuXHRJdGVtTWVkaWE6IHJlcXVpcmUoJy4vSXRlbU1lZGlhJyksXG5cdEl0ZW1Ob3RlOiByZXF1aXJlKCcuL0l0ZW1Ob3RlJyksXG5cdEtleXBhZDogcmVxdWlyZSgnLi9LZXlwYWQnKSxcblx0TGFiZWxJbnB1dDogcmVxdWlyZSgnLi9MYWJlbElucHV0JyksXG5cdExhYmVsU2VsZWN0OiByZXF1aXJlKCcuL0xhYmVsU2VsZWN0JyksXG5cdExhYmVsVGV4dGFyZWE6IHJlcXVpcmUoJy4vTGFiZWxUZXh0YXJlYScpLFxuXHRMb2FkaW5nQnV0dG9uOiByZXF1aXJlKCcuL0xvYWRpbmdCdXR0b24nKSxcblx0TW9kYWw6IHJlcXVpcmUoJy4vTW9kYWwnKSxcblx0UGFzc2NvZGU6IHJlcXVpcmUoJy4vUGFzc2NvZGUnKSxcblx0UmFkaW9MaXN0OiByZXF1aXJlKCcuL1JhZGlvTGlzdCcpLFxuXHRTd2l0Y2g6IHJlcXVpcmUoJy4vU3dpdGNoJyksXG5cdFRleHRhcmVhOiByZXF1aXJlKCcuL1RleHRhcmVhJyksXG5cdFRvZ2dsZTogcmVxdWlyZSgnLi9Ub2dnbGUnKSxcblx0VmlldzogcmVxdWlyZSgnLi9WaWV3JyksXG5cdFZpZXdDb250ZW50OiByZXF1aXJlKCcuL1ZpZXdDb250ZW50Jylcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBibGFja2xpc3QgKHNyYykge1xuICB2YXIgY29weSA9IHt9LCBmaWx0ZXIgPSBhcmd1bWVudHNbMV1cblxuICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICBmaWx0ZXIgPSB7fVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmaWx0ZXJbYXJndW1lbnRzW2ldXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBrZXkgaW4gc3JjKSB7XG4gICAgLy8gYmxhY2tsaXN0P1xuICAgIGlmIChmaWx0ZXJba2V5XSkgY29udGludWVcblxuICAgIGNvcHlba2V5XSA9IHNyY1trZXldXG4gIH1cblxuICByZXR1cm4gY29weVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0eyBuYW1lOiAnRGVjZW1iZXInLCAgIG51bWJlcjogJzEyJywgIHNlYXNvbjogJ1N1bW1lcicgfSxcblx0eyBuYW1lOiAnSmFudWFyeScsICAgIG51bWJlcjogJzEnLCAgIHNlYXNvbjogJ1N1bW1lcicgfSxcblx0eyBuYW1lOiAnRmVicnVhcnknLCAgIG51bWJlcjogJzInLCAgIHNlYXNvbjogJ1N1bW1lcicgfSxcblx0eyBuYW1lOiAnTWFyY2gnLCAgICAgIG51bWJlcjogJzMnLCAgIHNlYXNvbjogJ0F1dHVtbicgfSxcblx0eyBuYW1lOiAnQXByaWwnLCAgICAgIG51bWJlcjogJzQnLCAgIHNlYXNvbjogJ0F1dHVtbicgfSxcblx0eyBuYW1lOiAnTWF5JywgICAgICAgIG51bWJlcjogJzUnLCAgIHNlYXNvbjogJ0F1dHVtbicgfSxcblx0eyBuYW1lOiAnSnVuZScsICAgICAgIG51bWJlcjogJzYnLCAgIHNlYXNvbjogJ1dpbnRlcicgfSxcblx0eyBuYW1lOiAnSnVseScsICAgICAgIG51bWJlcjogJzcnLCAgIHNlYXNvbjogJ1dpbnRlcicgfSxcblx0eyBuYW1lOiAnQXVndXN0JywgICAgIG51bWJlcjogJzgnLCAgIHNlYXNvbjogJ1dpbnRlcicgfSxcblx0eyBuYW1lOiAnU2VwdGVtYmVyJywgIG51bWJlcjogJzknLCAgIHNlYXNvbjogJ1NwcmluZycgfSxcblx0eyBuYW1lOiAnT2N0b2JlcicsICAgIG51bWJlcjogJzEwJywgIHNlYXNvbjogJ1NwcmluZycgfSxcblx0eyBuYW1lOiAnTm92ZW1iZXInLCAgIG51bWJlcjogJzExJywgIHNlYXNvbjogJ1NwcmluZycgfVxuXTsiLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0eyBuYW1lOiB7IGZpcnN0OiAnQmVuamFtaW4nLCBsYXN0OiAnTHVwdG9uJyB9LCAgICBqb2luZWREYXRlOiAnTWFyIDgsIDIwMDknLCAgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczAuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNjExNDg/dj0zJnM9NDYwJywgICAgYmlvOiAnJywgIGZsYXZvdXI6ICd2YW5pbGxhJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ0JvcmlzJywgICAgbGFzdDogJ0JvemljJyB9LCAgICAgam9pbmVkRGF0ZTogJ01hciAxMiwgMjAxMycsICBsb2NhdGlvbjogJ1N5ZG5leSwgQVUnLCAgICAgICAgICBpbWc6ICdodHRwczovL2F2YXRhcnMxLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzM4Mzg3MTY/dj0zJnM9NDYwJywgIGJpbzogJycsICBmbGF2b3VyOiAnY2hvY29sYXRlJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ0NhcmxvcycsICAgbGFzdDogJ0NvbG9uJyB9LCAgICAgam9pbmVkRGF0ZTogJ05vdiA3LCAyMDEzJywgICBsb2NhdGlvbjogJ05ldyBIYW1wc2hpcmUsIFVTQScsICBpbWc6ICdodHRwczovL2F2YXRhcnMzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzU4NzI1MTU/dj0zJnM9NDYwJywgIGJpbzogJycsICBmbGF2b3VyOiAnY2FyYW1lbCd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdEYXZpZCcsICAgIGxhc3Q6ICdCYW5oYW0nIH0sICAgIGpvaW5lZERhdGU6ICdGZWIgMjIsIDIwMTEnLCAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMy5naXRodWJ1c2VyY29udGVudC5jb20vdS82MzE4MzI/dj0zJnM9NDYwJywgICBiaW86ICcnLCAgZmxhdm91cjogJ3N0cmF3YmVycnknfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnRnJlZGVyaWMnLCBsYXN0OiAnQmVhdWRldCcgfSwgICBqb2luZWREYXRlOiAnTWFyIDEyLCAyMDEzJywgIGxvY2F0aW9uOiAnTW9udHJlYWwnLCAgICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczAuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMzgzMzMzNT92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdzdHJhd2JlcnJ5J30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ0phbWVzJywgICAgbGFzdDogJ0FsbGVuJyB9LCAgICAgam9pbmVkRGF0ZTogJ0ZlYiAxNCwgMjAxMycsICBsb2NhdGlvbjogJ01hbmNoZXN0ZXInLCAgICAgICAgICBpbWc6ICcnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdiYW5hbmEnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnSmVkJywgICAgICBsYXN0OiAnV2F0c29uJyB9LCAgICBqb2luZWREYXRlOiAnSnVuIDI0LCAyMDExJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczEuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvODcyMzEwP3Y9MyZzPTQ2MCcsICAgYmlvOiAnJywgIGZsYXZvdXI6ICdiYW5hbmEnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnSm9zcycsICAgICBsYXN0OiAnTWFja2lzb24nIH0sICBqb2luZWREYXRlOiAnTm92IDYsIDIwMTInLCAgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczIuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMjczMDgzMz92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdsZW1vbid9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdKb2hubnknLCAgIGxhc3Q6ICdFc3RpbGxlcycgfSwgIGpvaW5lZERhdGU6ICdTZXAgMjMsIDIwMTMnLCAgbG9jYXRpb246ICdQaGlsaXBwaW5lcycsICAgICAgICAgaW1nOiAnJywgIGJpbzogJycsICBmbGF2b3VyOiAnbGVtb24nfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnTWFya3VzJywgICBsYXN0OiAnUGFkb3VyZWsnIH0sICBqb2luZWREYXRlOiAnT2N0IDE3LCAyMDEyJywgIGxvY2F0aW9uOiAnTG9uZG9uLCBVSycsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczIuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMjU4MDI1ND92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdwYXN0YWNjaW8nfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnTWlrZScsICAgICBsYXN0OiAnR3JhYm93c2tpJyB9LCBqb2luZWREYXRlOiAnT2N0IDIsIDIwMTInLCAgIGxvY2F0aW9uOiAnTG9uZG9uLCBVSycsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMjQ2NDk2Nj92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICd2YW5pbGxhJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ1JvYicsICAgICAgbGFzdDogJ01vcnJpcycgfSwgICAgam9pbmVkRGF0ZTogJ09jdCAxOCwgMjAxMicsICBsb2NhdGlvbjogJ1N5ZG5leSwgQVUnLCAgICAgICAgICBpbWc6ICdodHRwczovL2F2YXRhcnMzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzI1ODcxNjM/dj0zJnM9NDYwJywgIGJpbzogJycsICBmbGF2b3VyOiAnY2hvY29sYXRlJ30sXG5cdHsgbmFtZTogeyBmaXJzdDogJ1NpbW9uJywgICAgbGFzdDogJ1RheWxvcicgfSwgICAgam9pbmVkRGF0ZTogJ1NlcCAxNCwgMjAxMycsICBsb2NhdGlvbjogJ1N5ZG5leSwgQVUnLCAgICAgICAgICBpbWc6ICdodHRwczovL2F2YXRhcnMxLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzU0NTcyNjc/dj0zJnM9NDYwJywgIGJpbzogJycsICBmbGF2b3VyOiAnY2FyYW1lbCd9LFxuXHR7IG5hbWU6IHsgZmlyc3Q6ICdTdGV2ZW4nLCAgIGxhc3Q6ICdTdGVuZWtlcicgfSwgIGpvaW5lZERhdGU6ICdKdW4gMzAsIDIwMDgnLCAgbG9jYXRpb246ICdTeWRuZXksIEFVJywgICAgICAgICAgaW1nOiAnaHR0cHM6Ly9hdmF0YXJzMy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTU1ND92PTMmcz00NjAnLCAgICBiaW86ICcnLCAgZmxhdm91cjogJ3N0cmF3YmVycnknfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnVG9tJywgICAgICBsYXN0OiAnV2Fsa2VyJyB9LCAgICBqb2luZWREYXRlOiAnQXByIDE5LCAyMDExJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczIuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNzM3ODIxP3Y9MyZzPTQ2MCcsICAgYmlvOiAnJywgIGZsYXZvdXI6ICdiYW5hbmEnfSxcblx0eyBuYW1lOiB7IGZpcnN0OiAnVHVhbicsICAgICBsYXN0OiAnSG9hbmcnIH0sICAgICBqb2luZWREYXRlOiAnTWFyIDE5LCAyMDEzJywgIGxvY2F0aW9uOiAnU3lkbmV5LCBBVScsICAgICAgICAgIGltZzogJ2h0dHBzOi8vYXZhdGFyczAuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMzkwNjUwNT92PTMmcz00NjAnLCAgYmlvOiAnJywgIGZsYXZvdXI6ICdsZW1vbicgfVxuXTsiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBSZWFjdENTU1RyYW5zaXRpb25Hcm91cCA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIFRvdWNoc3RvbmUgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKTtcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG5cbnZhciB2aWV3cyA9IHtcblxuICAvLyBhcHBcbiAgJ2hvbWUnOiByZXF1aXJlKCcuL3ZpZXdzL2hvbWUnKSxcblxuICAvLyBjb21wb25lbnRzXG4gICdjb21wb25lbnQtZmVlZGJhY2snOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9mZWVkYmFjaycpLFxuXG4gICdjb21wb25lbnQtaGVhZGVyYmFyJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvYmFyLWhlYWRlcicpLFxuICAnY29tcG9uZW50LWhlYWRlcmJhci1zZWFyY2gnOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9iYXItaGVhZGVyLXNlYXJjaCcpLFxuICAnY29tcG9uZW50LWFsZXJ0YmFyJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvYmFyLWFsZXJ0JyksXG4gICdjb21wb25lbnQtYWN0aW9uYmFyJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvYmFyLWFjdGlvbicpLFxuICAnY29tcG9uZW50LWZvb3RlcmJhcic6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2Jhci1mb290ZXInKSxcblxuICAnY29tcG9uZW50LXBhc3Njb2RlJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvcGFzc2NvZGUnKSxcbiAgJ2NvbXBvbmVudC10b2dnbGUnOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC90b2dnbGUnKSxcbiAgJ2NvbXBvbmVudC1mb3JtJzogcmVxdWlyZSgnLi92aWV3cy9jb21wb25lbnQvZm9ybScpLFxuXG4gICdjb21wb25lbnQtc2ltcGxlLWxpc3QnOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9saXN0LXNpbXBsZScpLFxuICAnY29tcG9uZW50LWNvbXBsZXgtbGlzdCc6IHJlcXVpcmUoJy4vdmlld3MvY29tcG9uZW50L2xpc3QtY29tcGxleCcpLFxuICAnY29tcG9uZW50LWNhdGVnb3Jpc2VkLWxpc3QnOiByZXF1aXJlKCcuL3ZpZXdzL2NvbXBvbmVudC9saXN0LWNhdGVnb3Jpc2VkJyksXG5cbiAgLy8gdHJhbnNpdGlvbnNcbiAgJ3RyYW5zaXRpb25zJzogcmVxdWlyZSgnLi92aWV3cy90cmFuc2l0aW9ucycpLFxuICAndHJhbnNpdGlvbnMtdGFyZ2V0JzogcmVxdWlyZSgnLi92aWV3cy90cmFuc2l0aW9ucy10YXJnZXQnKSxcblxuICAvLyBkZXRhaWxzIHZpZXdcbiAgJ2RldGFpbHMnOiByZXF1aXJlKCcuL3ZpZXdzL2RldGFpbHMnKSxcbiAgJ3JhZGlvLWxpc3QnOiByZXF1aXJlKCcuL3ZpZXdzL3JhZGlvLWxpc3QnKVxufTtcblxudmFyIEFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgbWl4aW5zOiBbVG91Y2hzdG9uZS5jcmVhdGVBcHAodmlld3MpXSxcblxuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3RhcnRWaWV3ID0gJ2hvbWUnO1xuXG4gICAgLy8gcmVzb3J0IHRvICN2aWV3TmFtZSBpZiBpdCBleGlzdHNcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgIHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG5cbiAgICAgIGlmIChoYXNoIGluIHZpZXdzKSBzdGFydFZpZXcgPSBoYXNoO1xuICAgIH1cblxuICAgIHZhciBpbml0aWFsU3RhdGUgPSB7XG4gICAgICBjdXJyZW50Vmlldzogc3RhcnRWaWV3LFxuICAgICAgaXNOYXRpdmVBcHA6ICh0eXBlb2YgY29yZG92YSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgfTtcblxuICAgIHJldHVybiBpbml0aWFsU3RhdGU7XG4gIH0sXG5cbiAgZ290b0RlZmF1bHRWaWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zaG93VmlldygnaG9tZScsICdmYWRlJyk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFdyYXBwZXJDbGFzc05hbWUgPSBjbGFzc25hbWVzKHtcbiAgICAgICdhcHAtd3JhcHBlcic6IHRydWUsXG4gICAgICAnaXMtbmF0aXZlLWFwcCc6IHRoaXMuc3RhdGUuaXNOYXRpdmVBcHBcbiAgICB9KTtcblxuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT17YXBwV3JhcHBlckNsYXNzTmFtZX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGV2aWNlLXNpbGhvdWV0dGVcIj5cbiAgICAgICAgICA8UmVhY3RDU1NUcmFuc2l0aW9uR3JvdXAgdHJhbnNpdGlvbk5hbWU9e3RoaXMuc3RhdGUudmlld1RyYW5zaXRpb24ubmFtZX0gdHJhbnNpdGlvbkVudGVyPXt0aGlzLnN0YXRlLnZpZXdUcmFuc2l0aW9uLmlufSB0cmFuc2l0aW9uTGVhdmU9e3RoaXMuc3RhdGUudmlld1RyYW5zaXRpb24ub3V0fSBjbGFzc05hbWU9XCJ2aWV3LXdyYXBwZXJcIiBjb21wb25lbnQ9XCJkaXZcIj5cbiAgICAgICAgICAgIHt0aGlzLmdldEN1cnJlbnRWaWV3KCl9XG4gICAgICAgICAgPC9SZWFjdENTU1RyYW5zaXRpb25Hcm91cD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGVtby13cmFwcGVyXCI+XG4gICAgICAgICAgPGltZyBzcmM9XCJpbWcvbG9nby1tYXJrLnN2Z1wiIGFsdD1cIlRvdWNoc3RvbmVKU1wiIGNsYXNzTmFtZT1cImRlbW8tYnJhbmRcIiB3aWR0aD1cIjgwXCIgaGVpZ2h0PVwiODBcIiAvPlxuICAgICAgICAgIDxoMT5cbiAgICAgICAgICAgIFRvdWNoc3RvbmVKU1xuICAgICAgICAgICAgPHNtYWxsPiBkZW1vPC9zbWFsbD5cbiAgICAgICAgICA8L2gxPlxuICAgICAgICAgIDxwPlJlYWN0LmpzIHBvd2VyZWQgVUkgZnJhbWV3b3JrIGZvciBkZXZlbG9waW5nIGJlYXV0aWZ1bCBoeWJyaWQgbW9iaWxlIGFwcHMuPC9wPlxuICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJkZW1vLWxpbmtzXCI+XG4gICAgICAgICAgICA8bGk+PGEgaHJlZj1cImh0dHBzOi8vdHdpdHRlci5jb20vdG91Y2hzdG9uZWpzXCIgdGFyZ2V0PVwiX2JsYW5rXCIgY2xhc3NOYW1lPVwiaW9uLXNvY2lhbC10d2l0dGVyXCI+VHdpdHRlcjwvYT48L2xpPlxuICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vamVkd2F0c29uL3RvdWNoc3RvbmVqc1wiIHRhcmdldD1cIl9ibGFua1wiIGNsYXNzTmFtZT1cImlvbi1zb2NpYWwtZ2l0aHViXCI+R2l0aHViPC9hPjwvbGk+XG4gICAgICAgICAgICA8bGk+PGEgaHJlZj1cImh0dHA6Ly90b3VjaHN0b25lanMuaW9cIiB0YXJnZXQ9XCJfYmxhbmtcIiBjbGFzc05hbWU9XCJpb24tbWFwXCI+Um9hZG1hcDwvYT48L2xpPlxuICAgICAgICAgIDwvdWw+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHN0YXJ0QXBwICgpIHtcbiAgUmVhY3QucmVuZGVyKDxBcHAgLz4sIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKSk7XG59XG5cbmZ1bmN0aW9uIG9uRGV2aWNlUmVhZHkgKCkge1xuICBTdGF0dXNCYXIuc3R5bGVEZWZhdWx0KCk7XG4gIHN0YXJ0QXBwKCk7XG59XG5cbmlmICh0eXBlb2YgY29yZG92YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgc3RhcnRBcHAoKTtcbn0gZWxzZSB7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5Jywgb25EZXZpY2VSZWFkeSwgZmFsc2UpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7fTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGZsYXNoQWxlcnQ6IGZ1bmN0aW9uIChhbGVydENvbnRlbnQpIHtcblx0XHRhbGVydChhbGVydENvbnRlbnQpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJBY3Rpb24gQmFyXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgbGFiZWw9XCJCYWNrXCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5MYWJlbCBPbmx5PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbnM+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9ICBsYWJlbD1cIlByaW1hcnkgQWN0aW9uXCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gbGFiZWw9XCJTZWNvbmRhcnkgQWN0aW9uXCIgLz5cblx0XHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5JY29uIE9ubHk8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gIGljb249XCJpb24tYXJyb3ctdXAtY1wiIC8+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9IGljb249XCJpb24tYXJyb3ctZG93bi1jXCIgLz5cblx0XHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5JY29uICZhbXA7IExhYmVsPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbnM+XG5cdFx0XHRcdFx0XHRcdDxVSS5BY3Rpb25CdXR0b24gb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgdGFwcGVkIGFuIGFjdGlvbiBidXR0b24uJyl9ICBsYWJlbD1cIlByaW1hcnkgQWN0aW9uXCIgICAgaWNvbj1cImlvbi1hcnJvdy11cC1jXCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gbGFiZWw9XCJTZWNvbmRhcnkgQWN0aW9uXCIgaWNvbj1cImlvbi1hcnJvdy1kb3duLWNcIiAvPlxuXHRcdFx0XHRcdFx0PC9VSS5BY3Rpb25CdXR0b25zPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPkVhc2lseSBDdXN0b21pc2FibGU8L2Rpdj5cblx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9ucyBjbGFzc05hbWU9XCJzcGVjaWFsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9uIG9uVGFwPXt0aGlzLmZsYXNoQWxlcnQuYmluZCh0aGlzLCAnWW91IHRhcHBlZCBhbiBhY3Rpb24gYnV0dG9uLicpfSAgbGFiZWw9XCJQcmltYXJ5XCIgICBpY29uPVwiaW9uLWFuZHJvaWQtY29udGFjdFwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuQWN0aW9uQnV0dG9uIG9uVGFwPXt0aGlzLmZsYXNoQWxlcnQuYmluZCh0aGlzLCAnWW91IHRhcHBlZCBhbiBhY3Rpb24gYnV0dG9uLicpfSAgbGFiZWw9XCJTZWNvbmRhcnlcIiBpY29uPVwiaW9uLWFuZHJvaWQtY29udGFjdHNcIiAvPlxuXHRcdFx0XHRcdFx0PFVJLkFjdGlvbkJ1dHRvbiBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSB0YXBwZWQgYW4gYWN0aW9uIGJ1dHRvbi4nKX0gIGxhYmVsPVwiVGVydGlhcnlcIiAgaWNvbj1cImlvbi1hbmRyb2lkLWZyaWVuZHNcIiAvPlxuXHRcdFx0XHRcdDwvVUkuQWN0aW9uQnV0dG9ucz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhbGVydFR5cGU6ICdkZWZhdWx0J1xuXHRcdH1cblx0fSxcblxuXHRoYW5kbGVBbGVydENoYW5nZTogZnVuY3Rpb24gKG5ld0FsZXJ0VHlwZSkge1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRhbGVydFR5cGU6IG5ld0FsZXJ0VHlwZVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkFsZXJ0IEJhclwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5BbGVydGJhciB0eXBlPXt0aGlzLnN0YXRlLmFsZXJ0VHlwZX0+V2hlbiB0aGUgc3RhdGUgaXMgXCJ7dGhpcy5zdGF0ZS5hbGVydFR5cGV9XCI8L1VJLkFsZXJ0YmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0XCI+XG5cdFx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLmFsZXJ0VHlwZX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlQWxlcnRDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ0RlZmF1bHQnLCAgdmFsdWU6ICdkZWZhdWx0JyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnUHJpbWFyeScsICB2YWx1ZTogJ3ByaW1hcnknIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTdWNjZXNzJywgIHZhbHVlOiAnc3VjY2VzcycgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1dhcm5pbmcnLCAgdmFsdWU6ICd3YXJuaW5nJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnRGFuZ2VyJywgICB2YWx1ZTogJ2RhbmdlcicgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHRUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyksXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRMaW5rID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTGluayxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlS2V5OiAnaWNvbidcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlRm9vdGVyQ2hhbmdlOiBmdW5jdGlvbiAobmV3VHlwZSkge1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR0eXBlS2V5OiBuZXdUeXBlXG5cdFx0fSk7XG5cblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBmb290ZXJiYXJDbGFzcyA9IFNldENsYXNzKHRoaXMuc3RhdGUudHlwZUtleSwge1xuXHRcdFx0J2Zvb3RlcmJhcic6IHRydWVcblx0XHR9KTtcblx0XHR2YXIgcmVuZGVyRm9vdGVyYmFyO1xuXG5cdFx0aWYgKHRoaXMuc3RhdGUudHlwZUtleSA9PT0gJ2ljb24nKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGljb249XCJpb24taW9zNy1hcnJvdy1sZWZ0XCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBpY29uPVwiaW9uLWlvczctYXJyb3ctcmlnaHRcIiBkaXNhYmxlZCAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGljb249XCJpb24taW9zNy1kb3dubG9hZFwiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gaWNvbj1cImlvbi1pb3M3LWJvb2ttYXJrcy1vdXRsaW5lXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBpY29uPVwiaW9uLWlvczctYnJvd3NlcnNcIiAvPlxuXHRcdFx0PC9VSS5Gb290ZXJiYXI+KVxuXHRcdH0gZWxzZSBpZiAodGhpcy5zdGF0ZS50eXBlS2V5ID09PSAnbGFiZWwnKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gbGFiZWw9XCJGb3J3YXJkXCIgZGlzYWJsZWQgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkRvd25sb2FkXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkJvb2ttYXJrc1wiIC8+XG5cdFx0XHRcdDxVSS5Gb290ZXJiYXJCdXR0b24gbGFiZWw9XCJUYWJzXCIgLz5cblx0XHRcdDwvVUkuRm9vdGVyYmFyPilcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUudHlwZUtleSA9PT0gJ2JvdGgnKSB7XG5cdFx0XHRyZW5kZXJGb290ZXJiYXIgPSAoPFVJLkZvb3RlcmJhciB0eXBlPVwiZGVmYXVsdFwiPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24taW9zNy1hcnJvdy1sZWZ0XCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIkZvcndhcmRcIiBpY29uPVwiaW9uLWlvczctYXJyb3ctcmlnaHRcIiBkaXNhYmxlZCAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiRG93bmxvYWRcIiBpY29uPVwiaW9uLWlvczctZG93bmxvYWRcIiAvPlxuXHRcdFx0XHQ8VUkuRm9vdGVyYmFyQnV0dG9uIGxhYmVsPVwiQm9va21hcmtzXCIgaWNvbj1cImlvbi1pb3M3LWJvb2ttYXJrcy1vdXRsaW5lXCIgLz5cblx0XHRcdFx0PFVJLkZvb3RlcmJhckJ1dHRvbiBsYWJlbD1cIlRhYnNcIiBpY29uPVwiaW9uLWlvczctYnJvd3NlcnNcIiAvPlxuXHRcdFx0PC9VSS5Gb290ZXJiYXI+KVxuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiRm9vdGVyIEJhclwiPlxuXHRcdFx0XHRcdDxMaW5rIHRvPVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItYnV0dG9uIGlvbi1jaGV2cm9uLWxlZnRcIiBjb21wb25lbnQ9XCJidXR0b25cIj5CYWNrPC9MaW5rPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHR7Lyo8ZGl2IGNsYXNzTmFtZT1cInZpZXctaW5uZXJcIj5cblx0XHRcdFx0XHRcdDxVSS5Ub2dnbGUgdmFsdWU9e3RoaXMuc3RhdGUudHlwZUtleX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlRm9vdGVyQ2hhbmdlfSBvcHRpb25zPXtbXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdJY29uJywgdmFsdWU6ICdpY29uJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnTGFiZWwnLCB2YWx1ZTogJ2xhYmVsJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQm90aCcsIHZhbHVlOiAnYm90aCcgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj4qL31cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInZpZXctZmVlZGJhY2tcIj5cblx0XHRcdFx0XHRcdFlvdXIgYXBwJ3MgYW1hemluZyBjb250ZW50IGhlcmUuXG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHRcdHtyZW5kZXJGb290ZXJiYXJ9XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxudmFyIFRpbWVycyA9IHJlcXVpcmUoJ3JlYWN0LXRpbWVycycpO1xudmFyIE1vbnRocyA9IHJlcXVpcmUoJy4uLy4uLy4uL2RhdGEvbW9udGhzJyk7XG5cbnZhciBTZWFyY2ggPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW1RpbWVycygpXSxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRzZWFyY2hTdHJpbmc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWRcblx0fSxcblxuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnJlZnMuaW5wdXQuZ2V0RE9NTm9kZSgpLmZvY3VzKCk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKGV2ZW50LnRhcmdldC52YWx1ZSk7XG5cdH0sXG5cblx0cmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKCcnKTtcblx0XHR0aGlzLnJlZnMuaW5wdXQuZ2V0RE9NTm9kZSgpLmZvY3VzKCk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgY2xlYXJJY29uID0gQm9vbGVhbih0aGlzLnByb3BzLnNlYXJjaFN0cmluZy5sZW5ndGgpID8gPFRhcHBhYmxlIG9uVGFwPXt0aGlzLnJlc2V0fSBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybS1jbGVhciBpb24tY2xvc2UtY2lyY2xlZFwiIC8+IDogJyc7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGhlaWdodD1cIjM2cHhcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybSBTdWJoZWFkZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJIZWFkZXJiYXItZm9ybS1maWVsZCBIZWFkZXJiYXItZm9ybS1pY29uIGlvbi1pb3M3LXNlYXJjaC1zdHJvbmdcIj5cblx0XHRcdFx0XHQ8aW5wdXQgcmVmPVwiaW5wdXRcIiB2YWx1ZT17dGhpcy5wcm9wcy5zZWFyY2hTdHJpbmd9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUNoYW5nZX0gY2xhc3NOYW1lPVwiSGVhZGVyYmFyLWZvcm0taW5wdXRcIiBwbGFjZWhvbGRlcj0nU2VhcmNoLi4uJyAvPlxuXHRcdFx0XHRcdHtjbGVhckljb259XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0KTtcblx0fVxuXG59KTtcblxudmFyIEl0ZW0gPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJsaXN0LWl0ZW1cIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+e3RoaXMucHJvcHMubW9udGgubmFtZX08L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG52YXIgTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VhcmNoU3RyaW5nOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgc2VhcmNoU3RyaW5nID0gdGhpcy5wcm9wcy5zZWFyY2hTdHJpbmc7XG5cdFx0dmFyIG1vbnRocyA9IFtdO1xuXHRcdHZhclx0bGFzdFNlYXNvbiA9ICcnO1xuXHRcdHZhciByZW5kZXJMaXN0ID0gPGRpdiBjbGFzc05hbWU9XCJ2aWV3LWZlZWRiYWNrLXRleHRcIj5ObyBtYXRjaCBmb3VuZC4uLjwvZGl2PjtcblxuXHRcdHRoaXMucHJvcHMubW9udGhzLmZvckVhY2goZnVuY3Rpb24gKG1vbnRoLCBpKSB7XG5cblx0XHRcdC8vIGZpbHRlciBtb250aHNcblx0XHRcdGlmIChzZWFyY2hTdHJpbmcgJiYgbW9udGgubmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGluc2VydCBjYXRlZ29yaWVzXG5cblx0XHRcdHZhciBzZWFzb24gPSBtb250aC5zZWFzb247XG5cblx0XHRcdGlmIChsYXN0U2Vhc29uICE9PSBzZWFzb24pIHtcblx0XHRcdFx0bGFzdFNlYXNvbiA9IHNlYXNvbjtcblxuXHRcdFx0XHRtb250aHMucHVzaChcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaGVhZGVyXCIga2V5PXtcImxpc3QtaGVhZGVyLVwiICsgaX0+e3NlYXNvbn08L2Rpdj5cblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY3JlYXRlIGxpc3RcblxuXHRcdFx0bW9udGgua2V5ID0gJ21vbnRoLScgKyBpO1xuXHRcdFx0bW9udGhzLnB1c2goUmVhY3QuY3JlYXRlRWxlbWVudChJdGVtLCB7IG1vbnRoOiBtb250aCB9KSk7XG5cdFx0fSk7XG5cblx0XHR2YXIgd3JhcHBlckNsYXNzTmFtZSA9IFNldENsYXNzKG1vbnRocy5sZW5ndGggPyAncGFuZWwgbWItMCcgOiAndmlldy1mZWVkYmFjaycpO1xuXG5cdFx0aWYgKG1vbnRocy5sZW5ndGgpIHtcblx0XHRcdHJlbmRlckxpc3QgPSBtb250aHM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt3cmFwcGVyQ2xhc3NOYW1lfT5cblx0XHRcdFx0e3JlbmRlckxpc3R9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlYXJjaFN0cmluZzogJycsXG5cdFx0XHRtb250aHM6IE1vbnRoc1xuXHRcdH1cblx0fSxcblxuXHR1cGRhdGVTZWFyY2g6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHR0aGlzLnNldFN0YXRlKHsgc2VhcmNoU3RyaW5nOiBzdHIgfSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkZpbHRlciBNb250aHNcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8U2VhcmNoIHNlYXJjaFN0cmluZz17dGhpcy5zdGF0ZS5zZWFyY2hTdHJpbmd9IG9uQ2hhbmdlPXt0aGlzLnVwZGF0ZVNlYXJjaH0gLz5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8TGlzdCBtb250aHM9e3RoaXMuc3RhdGUubW9udGhzfSBzZWFyY2hTdHJpbmc9e3RoaXMuc3RhdGUuc2VhcmNoU3RyaW5nfSAvPlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZUtleTogJ2RlZmF1bHQnXG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUhlYWRlckNoYW5nZTogZnVuY3Rpb24gKG5ld1R5cGUpIHtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dHlwZUtleTogbmV3VHlwZVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT17dGhpcy5zdGF0ZS50eXBlS2V5fSBsYWJlbD1cIkhlYWRlciBCYXJcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0XCI+XG5cdFx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLnR5cGVLZXl9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUhlYWRlckNoYW5nZX0gb3B0aW9ucz17W1xuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnRGVmYXVsdCcsICB2YWx1ZTogJ2RlZmF1bHQnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdHcmVlbicsIHZhbHVlOiAnZ3JlZW4nIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdCbHVlJywgdmFsdWU6ICdibHVlJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnTGlnaHQgQmx1ZScsIHZhbHVlOiAnbGlnaHQtYmx1ZScgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1llbGxvdycsIHZhbHVlOiAneWVsbG93JyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnT3JhbmdlJywgdmFsdWU6ICdvcmFuZ2UnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdSZWQnLCB2YWx1ZTogJ3JlZCcgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1BpbmsnLCB2YWx1ZTogJ3BpbmsnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdQdXJwbGUnLCB2YWx1ZTogJ3B1cnBsZScgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGZsYXNoQWxlcnQ6IGZ1bmN0aW9uIChhbGVydENvbnRlbnQpIHtcblx0XHR3aW5kb3cuYWxlcnQoYWxlcnRDb250ZW50KTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkZlZWRiYWNrXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiBsYWJlbD1cIkJhY2tcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50PlxuXHRcdFx0XHRcdDxVSS5GZWVkYmFjayBpY29uTmFtZT1cImlvbi1jb21wYXNzXCIgaWNvblR5cGU9XCJwcmltYXJ5XCIgaGVhZGVyPVwiT3B0aW9uYWwgSGVhZGVyXCIgc3ViaGVhZGVyPVwiU3ViaGVhZGVyLCBhbHNvIG9wdGlvbmFsXCIgdGV4dD1cIkZlZWRiYWNrIG1lc3NhZ2UgY29weSBnb2VzIGhlcmUuIEl0IGNhbiBiZSBvZiBhbnkgbGVuZ3RoLlwiIGFjdGlvblRleHQ9XCJPcHRpb25hbCBBY3Rpb25cIiBhY3Rpb25Gbj17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSBjbGlja2VkIHRoZSBhY3Rpb24uJyl9IC8+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Zmxhdm91cjogJ3N0cmF3YmVycnknXG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUZsYXZvdXJDaGFuZ2U6IGZ1bmN0aW9uIChuZXdGbGF2b3VyKSB7XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGZsYXZvdXI6IG5ld0ZsYXZvdXJcblx0XHR9KTtcblxuXHR9LFxuXG5cdGhhbmRsZVN3aXRjaDogZnVuY3Rpb24gKGtleSwgZXZlbnQpIHtcblx0XHR2YXIgbmV3U3RhdGUgPSB7fTtcblx0XHRuZXdTdGF0ZVtrZXldID0gIXRoaXMuc3RhdGVba2V5XTtcblxuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJGb3JtXCI+XG5cdFx0XHRcdFx0PFVJLkhlYWRlcmJhckJ1dHRvbiBzaG93Vmlldz1cImhvbWVcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgbGFiZWw9XCJCYWNrXCIgaWNvbj1cImlvbi1jaGV2cm9uLWxlZnRcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5JbnB1dHM8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8VUkuSW5wdXQgcGxhY2Vob2xkZXI9XCJEZWZhdWx0XCIgLz5cblx0XHRcdFx0XHRcdDxVSS5JbnB1dCBkZWZhdWx0VmFsdWU9XCJXaXRoIFZhbHVlXCIgcGxhY2Vob2xkZXI9XCJQbGFjZWhvbGRlclwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuVGV4dGFyZWEgZGVmYXVsdFZhbHVlPVwiTG9uZ3RleHQgaXMgZ29vZCBmb3IgYmlvcyBldGMuXCIgcGxhY2Vob2xkZXI9XCJMb25ndGV4dFwiIC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+TGFiZWxsZWQgSW5wdXRzPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PFVJLkxhYmVsSW5wdXQgdHlwZT1cImVtYWlsXCIgbGFiZWw9XCJFbWFpbFwiICAgcGxhY2Vob2xkZXI9XCJ5b3VyLm5hbWVAZXhhbXBsZS5jb21cIiAvPlxuXHRcdFx0XHRcdFx0PFVJLkxhYmVsSW5wdXQgdHlwZT1cInVybFwiICAgbGFiZWw9XCJVUkxcIiAgICAgcGxhY2Vob2xkZXI9XCJodHRwOi8vd3d3LnlvdXJ3ZWJzaXRlLmNvbVwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuTGFiZWxJbnB1dCBub2VkaXQgICAgICAgbGFiZWw9XCJObyBFZGl0XCIgdmFsdWU9XCJVbi1lZGl0YWJsZSwgc2Nyb2xsYWJsZSwgc2VsZWN0YWJsZSBjb250ZW50XCIgLz5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbFNlbGVjdCBsYWJlbD1cIkZsYXZvdXJcIiB2YWx1ZT17dGhpcy5zdGF0ZS5mbGF2b3VyfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVGbGF2b3VyQ2hhbmdlfSBvcHRpb25zPXtbXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdWYW5pbGxhJywgICAgdmFsdWU6ICd2YW5pbGxhJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQ2hvY29sYXRlJywgIHZhbHVlOiAnY2hvY29sYXRlJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnQ2FyYW1lbCcsICAgIHZhbHVlOiAnY2FyYW1lbCcgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1N0cmF3YmVycnknLCB2YWx1ZTogJ3N0cmF3YmVycnknIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdCYW5hbmEnLCAgICAgdmFsdWU6ICdiYW5hbmEnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdMZW1vbicsICAgICAgdmFsdWU6ICdsZW1vbicgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1Bhc3RhY2NpbycsICB2YWx1ZTogJ3Bhc3RhY2NpbycgfVxuXHRcdFx0XHRcdFx0XX0gLz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGZpZWxkLWl0ZW1cIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+XG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJmaWVsZC1sYWJlbFwiPlN3aXRjaDwvZGl2PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5Td2l0Y2ggb25UYXA9e3RoaXMuaGFuZGxlU3dpdGNoLmJpbmQodGhpcywgJ3ZlcmlmaWVkQ3JlZGl0Q2FyZCcpfSBvbj17dGhpcy5zdGF0ZS52ZXJpZmllZENyZWRpdENhcmR9IC8+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBNb250aHMgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL21vbnRocycpO1xuXG52YXIgSGVhZGVyTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbW9udGhzID0gW107XG5cdFx0dmFyXHRsYXN0U2Vhc29uID0gJyc7XG5cdFx0XG5cdFx0dGhpcy5wcm9wcy5tb250aHMuZm9yRWFjaChmdW5jdGlvbiAobW9udGgsIGkpIHtcblxuXHRcdFx0dmFyIHNlYXNvbiA9IG1vbnRoLnNlYXNvbjtcblxuXHRcdFx0aWYgKGxhc3RTZWFzb24gIT09IHNlYXNvbikge1xuXHRcdFx0XHRsYXN0U2Vhc29uID0gc2Vhc29uO1xuXG5cdFx0XHRcdG1vbnRocy5wdXNoKFxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibGlzdC1oZWFkZXJcIiBrZXk9e1wibGlzdC1oZWFkZXItXCIgKyBpfT57c2Vhc29ufTwvZGl2PlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRtb250aC5rZXkgPSAnbW9udGgtJyArIGk7XG5cdFx0XHRtb250aHMucHVzaCg8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaXRlbVwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPnttb250aC5uYW1lfTwvZGl2PjwvZGl2Pik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgbWItMFwiPlxuXHRcdFx0XHR7bW9udGhzfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiQ2F0ZWdvcmlzZWQgTGlzdFwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgbGFiZWw9XCJCYWNrXCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudCBncm93IHNjcm9sbGFibGU+XG5cdFx0XHRcdFx0PEhlYWRlckxpc3QgbW9udGhzPXtNb250aHN9IC8+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBQZW9wbGUgPSByZXF1aXJlKCcuLi8uLi8uLi9kYXRhL3Blb3BsZScpO1xuXG52YXIgQ29tcGxleExpc3RJdGVtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRcblx0XHR2YXIgaW5pdGlhbHMgPSB0aGlzLnByb3BzLnVzZXIubmFtZS5maXJzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArXG5cdFx0XHR0aGlzLnByb3BzLnVzZXIubmFtZS5sYXN0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxMaW5rIHRvPVwiZGV0YWlsc1wiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgcGFyYW1zPXt7IHVzZXI6IHRoaXMucHJvcHMudXNlciwgcHJldlZpZXc6ICdjb21wb25lbnQtY29tcGxleC1saXN0JyB9fSBjbGFzc05hbWU9XCJsaXN0LWl0ZW1cIiBjb21wb25lbnQ9XCJkaXZcIj5cblx0XHRcdFx0PFVJLkl0ZW1NZWRpYSBhdmF0YXI9e3RoaXMucHJvcHMudXNlci5pbWd9IGF2YXRhckluaXRpYWxzPXtpbml0aWFsc30gLz5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWNvbnRlbnRcIj5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS10aXRsZVwiPntbdGhpcy5wcm9wcy51c2VyLm5hbWUuZmlyc3QsIHRoaXMucHJvcHMudXNlci5uYW1lLmxhc3RdLmpvaW4oJyAnKX08L2Rpdj5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1zdWJ0aXRsZVwiPnt0aGlzLnByb3BzLnVzZXIubG9jYXRpb259PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PFVJLkl0ZW1Ob3RlIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9e3RoaXMucHJvcHMudXNlci5qb2luZWREYXRlLnNsaWNlKC00KX0gaWNvbj1cImlvbi1jaGV2cm9uLXJpZ2h0XCIgLz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L0xpbms+XG5cdFx0KTtcblx0fVxufSk7XG5cbnZhciBDb21wbGV4TGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgdXNlcnMgPSBbXTtcblx0XHRcblx0XHR0aGlzLnByb3BzLnVzZXJzLmZvckVhY2goZnVuY3Rpb24gKHVzZXIsIGkpIHtcblx0XHRcdHVzZXIua2V5ID0gJ3VzZXItJyArIGk7XG5cdFx0XHR1c2Vycy5wdXNoKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ29tcGxleExpc3RJdGVtLCB7IHVzZXI6IHVzZXIgfSkpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIHBhbmVsLS1maXJzdCBhdmF0YXItbGlzdFwiPlxuXHRcdFx0XHRcdHt1c2Vyc31cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJDb21wbGV4IExpc3RcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxDb21wbGV4TGlzdCB1c2Vycz17UGVvcGxlfSAvPlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0U2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgUGVvcGxlID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9wZW9wbGUnKTtcblxudmFyIFNpbXBsZUxpc3RJdGVtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8TGluayB0bz1cImRldGFpbHNcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIHBhcmFtcz17eyB1c2VyOiB0aGlzLnByb3BzLnVzZXIsIHByZXZWaWV3OiAnY29tcG9uZW50LXNpbXBsZS1saXN0JyB9fSBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLXRpdGxlXCI+e1t0aGlzLnByb3BzLnVzZXIubmFtZS5maXJzdCwgdGhpcy5wcm9wcy51c2VyLm5hbWUubGFzdF0uam9pbignICcpfTwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvTGluaz5cblx0XHQpO1xuXHR9XG59KTtcblxudmFyIFNpbXBsZUxpc3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHVzZXJzID0gW107XG5cdFx0XG5cdFx0dGhpcy5wcm9wcy51c2Vycy5mb3JFYWNoKGZ1bmN0aW9uICh1c2VyLCBpKSB7XG5cdFx0XHR1c2VyLmtleSA9ICd1c2VyLScgKyBpO1xuXHRcdFx0dXNlcnMucHVzaChSZWFjdC5jcmVhdGVFbGVtZW50KFNpbXBsZUxpc3RJdGVtLCB7IHVzZXI6IHVzZXIgfSkpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIHBhbmVsLS1maXJzdFwiPlxuXHRcdFx0XHRcdHt1c2Vyc31cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb25dLFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxVSS5WaWV3PlxuXHRcdFx0XHQ8VUkuSGVhZGVyYmFyIHR5cGU9XCJkZWZhdWx0XCIgbGFiZWw9XCJTaW1wbGUgTGlzdFwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5WaWV3Q29udGVudCBncm93IHNjcm9sbGFibGU+XG5cdFx0XHRcdFx0PFNpbXBsZUxpc3QgdXNlcnM9e1Blb3BsZX0gLz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdERpYWxvZ3MgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5EaWFsb2dzLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0VUkgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5VSTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIERpYWxvZ3NdLFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7fVxuXHR9LFxuXG5cdGhhbmRsZVBhc3Njb2RlOiBmdW5jdGlvbiAocGFzc2NvZGUpIHtcblx0XHRhbGVydCgnWW91ciBwYXNzY29kZSBpcyBcIicgKyBwYXNzY29kZSArICdcIi4nKTtcblxuXHRcdHRoaXMuc2hvd1ZpZXcoJ2hvbWUnLCAnZmFkZScpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiRW50ZXIgUGFzc2NvZGVcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuUGFzc2NvZGUgYWN0aW9uPXt0aGlzLmhhbmRsZVBhc3Njb2RlfSBoZWxwVGV4dD1cIkVudGVyIGEgcGFzc2NvZGVcIiAvPlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0U2V0Q2xhc3MgPSByZXF1aXJlKCdjbGFzc25hbWVzJyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgTW9udGhzID0gcmVxdWlyZSgnLi4vLi4vLi4vZGF0YS9tb250aHMnKTtcblxudmFyIE1vbnRoTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbW9udGhzID0gW107XG5cdFx0dmFyXHRsYXN0U2Vhc29uID0gJyc7XG5cdFx0dmFyIGZpbHRlclN0YXRlID0gdGhpcy5wcm9wcy5maWx0ZXJTdGF0ZTtcblx0XHRcblx0XHR0aGlzLnByb3BzLm1vbnRocy5mb3JFYWNoKGZ1bmN0aW9uIChtb250aCwgaSkge1xuXHRcdFx0XG5cdFx0XHRpZiAoZmlsdGVyU3RhdGUgIT09ICdhbGwnICYmIGZpbHRlclN0YXRlICE9PSBtb250aC5zZWFzb24udG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBzZWFzb24gPSBtb250aC5zZWFzb247XG5cblx0XHRcdGlmIChsYXN0U2Vhc29uICE9PSBzZWFzb24pIHtcblx0XHRcdFx0bGFzdFNlYXNvbiA9IHNlYXNvbjtcblxuXHRcdFx0XHRtb250aHMucHVzaChcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImxpc3QtaGVhZGVyXCIga2V5PXtcImxpc3QtaGVhZGVyLVwiICsgaX0+e3NlYXNvbn08L2Rpdj5cblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0bW9udGgua2V5ID0gJ21vbnRoLScgKyBpO1xuXHRcdFx0bW9udGhzLnB1c2goPGRpdiBjbGFzc05hbWU9XCJsaXN0LWl0ZW1cIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj57bW9udGgubmFtZX08L2Rpdj48L2Rpdj4pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsIG1iLTBcIj5cblx0XHRcdFx0e21vbnRoc31cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbl0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFjdGl2ZVRvZ2dsZUl0ZW1LZXk6ICdhbGwnLFxuXHRcdFx0dHlwZUtleTogJ3ByaW1hcnknLFxuXHRcdFx0bW9udGhzOiBNb250aHNcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlVG9nZ2xlQWN0aXZlQ2hhbmdlOiBmdW5jdGlvbiAobmV3SXRlbSkge1xuXG5cdFx0dmFyIHNlbGVjdGVkSXRlbSA9IG5ld0l0ZW07XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5hY3RpdmVUb2dnbGVJdGVtS2V5ID09PSBuZXdJdGVtKSB7XG5cdFx0XHRzZWxlY3RlZEl0ZW0gPSAnYWxsJztcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGFjdGl2ZVRvZ2dsZUl0ZW1LZXk6IHNlbGVjdGVkSXRlbVxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIlRvZ2dsZVwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJob21lXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIGxhYmVsPVwiQmFja1wiIGljb249XCJpb24tY2hldnJvbi1sZWZ0XCIgLz5cblx0XHRcdFx0PC9VSS5IZWFkZXJiYXI+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBoZWlnaHQ9XCIzNnB4XCIgY2xhc3NOYW1lPVwiU3ViaGVhZGVyXCI+XG5cdFx0XHRcdFx0PFVJLlRvZ2dsZSB2YWx1ZT17dGhpcy5zdGF0ZS5hY3RpdmVUb2dnbGVJdGVtS2V5fSBvbkNoYW5nZT17dGhpcy5oYW5kbGVUb2dnbGVBY3RpdmVDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTdW1tZXInLCB2YWx1ZTogJ3N1bW1lcicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdBdXR1bW4nLCB2YWx1ZTogJ2F1dHVtbicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdXaW50ZXInLCB2YWx1ZTogJ3dpbnRlcicgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdTcHJpbmcnLCB2YWx1ZTogJ3NwcmluZycgfVxuXHRcdFx0XHRcdF19IC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxNb250aExpc3QgbW9udGhzPXt0aGlzLnN0YXRlLm1vbnRoc30gZmlsdGVyU3RhdGU9e3RoaXMuc3RhdGUuYWN0aXZlVG9nZ2xlSXRlbUtleX0gLz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKSxcblx0RGlhbG9ncyA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkRpYWxvZ3MsXG5cdE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uLFxuXHRVSSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLlVJO1xuXG52YXIgVGltZXJzID0gcmVxdWlyZSgncmVhY3QtdGltZXJzJylcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIERpYWxvZ3MsIFRpbWVycygpXSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cHJldlZpZXc6ICdob21lJ1xuXHRcdH1cblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cHJvY2Vzc2luZzogZmFsc2UsXG5cdFx0XHRmb3JtSXNWYWxpZDogZmFsc2UsXG5cdFx0XHRiaW9WYWx1ZTogdGhpcy5wcm9wcy51c2VyLmJpbyB8fCAnJ1xuXHRcdH1cblx0fSxcblxuXHRzaG93Rmxhdm91ckxpc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnNob3dWaWV3KCdyYWRpby1saXN0JywgJ3Nob3ctZnJvbS1yaWdodCcsIHsgdXNlcjogdGhpcy5wcm9wcy51c2VyLCBmbGF2b3VyOiB0aGlzLnN0YXRlLmZsYXZvdXIgfSk7XG5cdH0sXG5cblx0aGFuZGxlQmlvSW5wdXQ6IGZ1bmN0aW9uIChldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0YmlvVmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZSxcblx0XHRcdGZvcm1Jc1ZhbGlkOiBldmVudC50YXJnZXQudmFsdWUubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0sXG5cblx0cHJvY2Vzc0Zvcm06IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgcHJvY2Vzc2luZzogdHJ1ZSB9KTtcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnNob3dWaWV3KCdob21lJywgJ2ZhZGUnLCB7fSk7XG5cdFx0fSwgNzUwKTtcblx0fSxcblxuXHRmbGFzaEFsZXJ0OiBmdW5jdGlvbiAoYWxlcnRDb250ZW50LCBjYWxsYmFjaykge1xuXHRcdHJldHVybiBjYWxsYmFjayh0aGlzLnNob3dBbGVydERpYWxvZyh7IG1lc3NhZ2U6IGFsZXJ0Q29udGVudCB9KSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHQvLyBmaWVsZHNcblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD17W3RoaXMucHJvcHMudXNlci5uYW1lLmZpcnN0LCB0aGlzLnByb3BzLnVzZXIubmFtZS5sYXN0XS5qb2luKCcgJyl9PlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9e3RoaXMucHJvcHMucHJldlZpZXd9IHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBsYWJlbD1cIkJhY2tcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdFx0PFVJLkxvYWRpbmdCdXR0b24gbG9hZGluZz17dGhpcy5zdGF0ZS5wcm9jZXNzaW5nfSBkaXNhYmxlZD17IXRoaXMuc3RhdGUuZm9ybUlzVmFsaWR9IG9uVGFwPXt0aGlzLnByb2Nlc3NGb3JtfSBsYWJlbD1cIlNhdmVcIiBjbGFzc05hbWU9XCJIZWFkZXJiYXItYnV0dG9uIHJpZ2h0IGlzLXByaW1hcnlcIiAvPlxuXHRcdFx0XHQ8L1VJLkhlYWRlcmJhcj5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHR7Lyo8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5CYXNpYyBkZXRhaWxzPC9kaXY+Ki99XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbCBwYW5lbC0tZmlyc3RcIj5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IGxhYmVsPVwiTmFtZVwiICAgICB2YWx1ZT17W3RoaXMucHJvcHMudXNlci5uYW1lLmZpcnN0LCB0aGlzLnByb3BzLnVzZXIubmFtZS5sYXN0XS5qb2luKCcgJyl9ICAgICAgIHBsYWNlaG9sZGVyPVwiRnVsbCBuYW1lXCIgZmlyc3QgLz5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IGxhYmVsPVwiTG9jYXRpb25cIiB2YWx1ZT17dGhpcy5wcm9wcy51c2VyLmxvY2F0aW9ufSAgIHBsYWNlaG9sZGVyPVwiU3VidXJiLCBDb3VudHJ5XCIgLz5cblx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IGxhYmVsPVwiSm9pbmVkXCIgICB2YWx1ZT17dGhpcy5wcm9wcy51c2VyLmpvaW5lZERhdGV9IHBsYWNlaG9sZGVyPVwiRGF0ZVwiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuTGFiZWxUZXh0YXJlYSBsYWJlbD1cIkJpb1wiICAgdmFsdWU9e3RoaXMuc3RhdGUuYmlvVmFsdWV9ICAgICAgICBwbGFjZWhvbGRlcj1cIihyZXF1aXJlZClcIiBvbkNoYW5nZT17dGhpcy5oYW5kbGVCaW9JbnB1dH0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8VGFwcGFibGUgb25UYXA9e3RoaXMuc2hvd0ZsYXZvdXJMaXN0fSBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtZmlyc3RcIiBjb21wb25lbnQ9XCJkaXZcIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+XG5cdFx0XHRcdFx0XHRcdFx0RmF2b3VyaXRlIEljZWNyZWFtXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLW5vdGUgZGVmYXVsdFwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLW5vdGUtbGFiZWxcIj57dGhpcy5wcm9wcy51c2VyLmZsYXZvdXJ9PC9kaXY+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0tbm90ZS1pY29uIGlvbi1jaGV2cm9uLXJpZ2h0XCIgLz5cblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L1RhcHBhYmxlPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxUYXBwYWJsZSBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSBjbGlja2VkIHRoZSBQcmltYXJ5IEJ1dHRvbi4nKX0gY2xhc3NOYW1lPVwicGFuZWwtYnV0dG9uIHByaW1hcnlcIiBjb21wb25lbnQ9XCJidXR0b25cIj5cblx0XHRcdFx0XHRcdFByaW1hcnkgQnV0dG9uXG5cdFx0XHRcdFx0PC9UYXBwYWJsZT5cblx0XHRcdFx0XHQ8VGFwcGFibGUgb25UYXA9e3RoaXMuZmxhc2hBbGVydC5iaW5kKHRoaXMsICdZb3UgY2xpY2tlZCB0aGUgRGVmYXVsdCBCdXR0b24uJyl9IGNsYXNzTmFtZT1cInBhbmVsLWJ1dHRvblwiIGNvbXBvbmVudD1cImJ1dHRvblwiPlxuXHRcdFx0XHRcdFx0RGVmYXVsdCBCdXR0b25cblx0XHRcdFx0XHQ8L1RhcHBhYmxlPlxuXHRcdFx0XHRcdDxUYXBwYWJsZSBvblRhcD17dGhpcy5mbGFzaEFsZXJ0LmJpbmQodGhpcywgJ1lvdSBjbGlja2VkIHRoZSBEYW5nZXIgQnV0dG9uLicpfSBjbGFzc05hbWU9XCJwYW5lbC1idXR0b24gZGFuZ2VyXCIgY29tcG9uZW50PVwiYnV0dG9uXCI+XG5cdFx0XHRcdFx0XHREYW5nZXIgQnV0dG9uXG5cdFx0XHRcdFx0PC9UYXBwYWJsZT5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIE5hdmlnYXRpb24gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5OYXZpZ2F0aW9uO1xudmFyIExpbmsgPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKS5MaW5rO1xudmFyIFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBUaW1lcnMgPSByZXF1aXJlKCdyZWFjdC10aW1lcnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW05hdmlnYXRpb24sIFRpbWVycygpXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0dmlzaWJsZTogZmFsc2Vcblx0XHRcdH1cblx0XHR9O1xuXHR9LFxuXHRzaG93TG9hZGluZ1BvcHVwOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRwb3B1cDoge1xuXHRcdFx0XHR2aXNpYmxlOiB0cnVlLFxuXHRcdFx0XHRsb2FkaW5nOiB0cnVlLFxuXHRcdFx0XHRoZWFkZXI6ICdMb2FkaW5nJyxcblx0XHRcdFx0aWNvbk5hbWU6ICdpb24tbG9hZC1jJyxcblx0XHRcdFx0aWNvblR5cGU6ICdkZWZhdWx0J1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRwb3B1cDoge1xuXHRcdFx0XHRcdHZpc2libGU6IHRydWUsXG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0aGVhZGVyOiAnRG9uZSEnLFxuXHRcdFx0XHRcdGljb25OYW1lOiAnaW9uLWlvczctY2hlY2ttYXJrJyxcblx0XHRcdFx0XHRpY29uVHlwZTogJ3N1Y2Nlc3MnXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDIwMDApO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRwb3B1cDoge1xuXHRcdFx0XHRcdHZpc2libGU6IGZhbHNlXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDMwMDApO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiVG91Y2hzdG9uZUpTXCIgLz5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50IGdyb3cgc2Nyb2xsYWJsZT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsLWhlYWRlciB0ZXh0LWNhcHNcIj5CYXJzPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtaGVhZGVyYmFyXCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+SGVhZGVyIEJhcjwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtaGVhZGVyYmFyLXNlYXJjaFwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPkhlYWRlciBCYXIgU2VhcmNoPC9kaXY+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayBjb21wb25lbnQ9XCJkaXZcIiB0bz1cImNvbXBvbmVudC1hbGVydGJhclwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPkFsZXJ0IEJhcjwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtZm9vdGVyYmFyXCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+Rm9vdGVyIEJhcjwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPkxpc3RzPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtc2ltcGxlLWxpc3RcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5TaW1wbGUgTGlzdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtY29tcGxleC1saXN0XCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+Q29tcGxleCBMaXN0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHR7LyogVGhpcyBpcyBjb3ZlcmVkIGluIG90aGVyIGNvbXBvbmVudHNcblx0XHRcdFx0XHRcdDxMaW5rIGNvbXBvbmVudD1cImRpdlwiIHRvPVwiY29tcG9uZW50LWNhdGVnb3Jpc2VkLWxpc3RcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5DYXRlZ29yaXNlZCBMaXN0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L0xpbms+Ki99XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+VUkgRWxlbWVudHM8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8TGluayBjb21wb25lbnQ9XCJkaXZcIiB0bz1cImNvbXBvbmVudC10b2dnbGVcIiAgIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlRvZ2dsZTwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtZm9ybVwiICAgICB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5Gb3JtIEZpZWxkczwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtcGFzc2NvZGVcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5QYXNzY29kZSAvIEtleXBhZDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PFRhcHBhYmxlIGNvbXBvbmVudD1cImRpdlwiIG9uVGFwPXt0aGlzLnNob3dMb2FkaW5nUG9wdXB9IGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5Mb2FkaW5nIFNwaW5uZXI8L2Rpdj5cblx0XHRcdFx0XHRcdDwvVGFwcGFibGU+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+QXBwbGljYXRpb24gU3RhdGU8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8TGluayBjb21wb25lbnQ9XCJkaXZcIiB0bz1cInRyYW5zaXRpb25zXCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+VmlldyBUcmFuc2l0aW9uczwvZGl2PlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgY29tcG9uZW50PVwiZGl2XCIgdG89XCJjb21wb25lbnQtZmVlZGJhY2tcIiB2aWV3VHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5WaWV3IEZlZWRiYWNrPC9kaXY+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvVUkuVmlld0NvbnRlbnQ+XG5cdFx0XHQ8L1VJLlZpZXc+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRTZXRDbGFzcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKSxcblx0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Zmxhdm91cjogdGhpcy5wcm9wcy51c2VyLmZsYXZvdXJcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlRmxhdm91ckNoYW5nZTogZnVuY3Rpb24gKG5ld0ZsYXZvdXIpIHtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Zmxhdm91cjogbmV3Rmxhdm91clxuXHRcdH0pO1xuXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIkZhdm91cml0ZSBJY2VjcmVhbVwiPlxuXHRcdFx0XHRcdDxVSS5IZWFkZXJiYXJCdXR0b24gc2hvd1ZpZXc9XCJkZXRhaWxzXCIgdmlld1RyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1yaWdodFwiIHZpZXdQcm9wcz17eyB1c2VyOiB0aGlzLnByb3BzLnVzZXIsIGZsYXZvdXI6IHRoaXMuc3RhdGUuZmxhdm91ciB9fSBsYWJlbD1cIkRldGFpbHNcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtLWZpcnN0XCI+XG5cdFx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLmZsYXZvdXJ9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUZsYXZvdXJDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ1ZhbmlsbGEnLCAgICB2YWx1ZTogJ3ZhbmlsbGEnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdDaG9jb2xhdGUnLCAgdmFsdWU6ICdjaG9jb2xhdGUnIH0sXG5cdFx0XHRcdFx0XHRcdHsgbGFiZWw6ICdDYXJhbWVsJywgICAgdmFsdWU6ICdjYXJhbWVsJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnU3RyYXdiZXJyeScsIHZhbHVlOiAnc3RyYXdiZXJyeScgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ0JhbmFuYScsICAgICB2YWx1ZTogJ2JhbmFuYScgfSxcblx0XHRcdFx0XHRcdFx0eyBsYWJlbDogJ0xlbW9uJywgICAgICB2YWx1ZTogJ2xlbW9uJyB9LFxuXHRcdFx0XHRcdFx0XHR7IGxhYmVsOiAnUGFzdGFjY2lvJywgIHZhbHVlOiAncGFzdGFjY2lvJyB9XG5cdFx0XHRcdFx0XHRdfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L1VJLlZpZXdDb250ZW50PlxuXHRcdFx0PC9VSS5WaWV3PlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0TmF2aWdhdGlvbiA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLk5hdmlnYXRpb24sXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbnZhciBUaW1lcnMgPSByZXF1aXJlKCdyZWFjdC10aW1lcnMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0bWl4aW5zOiBbTmF2aWdhdGlvbiwgVGltZXJzKCldLFxuXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuc2hvd1ZpZXcoJ3RyYW5zaXRpb25zJywgJ2ZhZGUnKTtcblx0XHR9LCAxMDAwKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PFVJLlZpZXc+XG5cdFx0XHRcdDxVSS5IZWFkZXJiYXIgdHlwZT1cImRlZmF1bHRcIiBsYWJlbD1cIlRhcmdldCBWaWV3XCIgLz5cblx0XHRcdFx0PFVJLlZpZXdDb250ZW50PlxuXHRcdFx0XHRcdDxVSS5GZWVkYmFjayBpY29uS2V5PVwiaW9uLWlvczctcGhvdG9zXCIgaWNvblR5cGU9XCJtdXRlZFwiIHRleHQ9XCJIb2xkIG9uIGEgc2VjLi4uXCIgLz5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JyksXG5cdFNldENsYXNzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpLFxuXHROYXZpZ2F0aW9uID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuTmF2aWdhdGlvbixcblx0TGluayA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpLkxpbmssXG5cdFVJID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJykuVUk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtOYXZpZ2F0aW9uXSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8VUkuVmlldz5cblx0XHRcdFx0PFVJLkhlYWRlcmJhciB0eXBlPVwiZGVmYXVsdFwiIGxhYmVsPVwiVHJhbnNpdGlvbnNcIj5cblx0XHRcdFx0XHQ8VUkuSGVhZGVyYmFyQnV0dG9uIHNob3dWaWV3PVwiaG9tZVwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tcmlnaHRcIiBpY29uPVwiaW9uLWNoZXZyb24tbGVmdFwiIGxhYmVsPVwiQmFja1wiIC8+XG5cdFx0XHRcdDwvVUkuSGVhZGVyYmFyPlxuXHRcdFx0XHQ8VUkuVmlld0NvbnRlbnQgZ3JvdyBzY3JvbGxhYmxlPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPkRlZmF1bHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPk5vbmU8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+RmFkZTwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWxcIj5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJmYWRlXCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+RmFkZTwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJmYWRlLWV4cGFuZFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPkZhZGUgRXhwYW5kPC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cImZhZGUtY29udHJhY3RcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5GYWRlIENvbnRyYWN0PC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGVyIHRleHQtY2Fwc1wiPlNob3c8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInBhbmVsXCI+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLWxlZnRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5TaG93IGZyb20gTGVmdDwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgdmlld1RyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5TaG93IGZyb20gUmlnaHQ8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLXRvcFwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlNob3cgZnJvbSBUb3A8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwic2hvdy1mcm9tLWJvdHRvbVwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlNob3cgZnJvbSBCb3R0b208L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkZXIgdGV4dC1jYXBzXCI+UmV2ZWFsPC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJwYW5lbFwiPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLWxlZnRcIiBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gaXMtdGFwcGFibGVcIiBjb21wb25lbnQ9XCJkaXZcIj48ZGl2IGNsYXNzTmFtZT1cIml0ZW0taW5uZXJcIj5SZXZlYWwgZnJvbSBMZWZ0PC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+UmV2ZWFsIGZyb20gUmlnaHQ8L2Rpdj48L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdUcmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tdG9wXCIgY2xhc3NOYW1lPVwibGlzdC1pdGVtIGlzLXRhcHBhYmxlXCIgY29tcG9uZW50PVwiZGl2XCI+PGRpdiBjbGFzc05hbWU9XCJpdGVtLWlubmVyXCI+UmV2ZWFsIGZyb20gVG9wPC9kaXY+PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0cmFuc2l0aW9ucy10YXJnZXRcIiB2aWV3VHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLWJvdHRvbVwiIGNsYXNzTmFtZT1cImxpc3QtaXRlbSBpcy10YXBwYWJsZVwiIGNvbXBvbmVudD1cImRpdlwiPjxkaXYgY2xhc3NOYW1lPVwiaXRlbS1pbm5lclwiPlJldmVhbCBmcm9tIEJvdHRvbTwvZGl2PjwvTGluaz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9VSS5WaWV3Q29udGVudD5cblx0XHRcdDwvVUkuVmlldz5cblx0XHQpO1xuXHR9XG59KTtcbiJdfQ==
