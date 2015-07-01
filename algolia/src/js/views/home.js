var React = require('react');
var Tappable = require('react-tappable');
var Navigation = require('touchstonejs').Navigation;
var Link = require('touchstonejs').Link;
var UI = require('touchstonejs').UI;
var SetClass = require('classnames');

var Timers = require('react-timers');

var People = require('../../data/people');

var ComplexListItem = React.createClass({
	mixins: [Navigation],


	render: function () {
		var initials = this.props.user.name.first.charAt(0).toUpperCase() +
			this.props.user.name.last.charAt(0).toUpperCase();

		return (
			<Link to="details" viewTransition="show-from-right" params={{ user: this.props.user, prevView: 'component-complex-list' }} className="list-item" component="div">
				<UI.ItemMedia avatar={this.props.user.img} avatarInitials={initials} />
				<div className="item-inner">
					<div className="item-content">
						<div className="item-title">{[this.props.user.name.first, this.props.user.name.last].join(' ')}</div>
						<div className="item-subtitle">{this.props.user.location}</div>
					</div>
					<UI.ItemNote type="default" label={this.props.user.joinedDate.slice(-4)} icon="ion-chevron-right" />
				</div>
			</Link>
		);
	}
});

var ComplexList = React.createClass({
	render: function () {
		var users = [];
		this.props.users.forEach(function (user, i) {
			user.key = 'user-' + i;
			users.push(React.createElement(ComplexListItem, { user: user }));
		});
		return (
			<div>
				<div className="panel panel--first avatar-list">
					{users}
				</div>
			</div>
		);
	}
});

module.exports = React.createClass({
	mixins: [Navigation],

	render: function () {
		return (
			<UI.View>
				<UI.Headerbar type="default" height="36px" className="Headerbar-form Subheader">
					<UI.HeaderbarButton showView="component-form" viewTransition="reveal-from-left"  className="Headerbar-button right" label="Settings" />
				</UI.Headerbar>
				<UI.ViewContent grow scrollable>
					<ComplexList users={People} />
				</UI.ViewContent>
			</UI.View>
		);
	}
});
