var React = require('react'),
	Tappable = require('react-tappable'),
	Dialogs = require('touchstonejs').Dialogs,
	Navigation = require('touchstonejs').Navigation,
	UI = require('touchstonejs').UI;

var Timers = require('react-timers')

module.exports = React.createClass({
	mixins: [Navigation, Dialogs, Timers()],

	getDefaultProps: function () {
		return {
			prevView: 'home'
		}
	},

	getInitialState: function () {
		return {
			processing: false,
			formIsValid: false,
			bioValue: this.props.user.bio || ''
		}
	},

	showFlavourList: function () {
		this.showView('radio-list', 'show-from-right', { user: this.props.user, flavour: this.state.flavour });
	},

	handleBioInput: function (event) {
		this.setState({
			bioValue: event.target.value,
			formIsValid: event.target.value.length ? true : false
		});
	},

	processForm: function () {
		var self = this;

		this.setState({ processing: true });

		this.setTimeout(function () {
			self.showView('home', 'fade', {});
		}, 750);
	},

	flashAlert: function (alertContent, callback) {
		return callback(this.showAlertDialog({ message: alertContent }));
	},

	render: function () {

		// fields
		return (
			<UI.View>
				<UI.Headerbar type="default" label={[this.props.user.name.first, this.props.user.name.last].join(' ')}>
					<UI.HeaderbarButton showView="home" viewTransition="reveal-from-right" label="Back" icon="ion-chevron-left" />
					<UI.LoadingButton loading={this.state.processing} disabled={!this.state.formIsValid} onTap={this.processForm} label="Save" className="Headerbar-button right is-primary" />
				</UI.Headerbar>
				<UI.ViewContent grow scrollable>
					{/*<div className="panel-header text-caps">Basic details</div>*/}
					<div className="panel panel--first">
						<UI.LabelTextarea label="Note"   value={this.state.bioValue}        placeholder="(required)" onChange={this.handleBioInput} />
					</div>
					<Tappable onTap={this.flashAlert.bind(this, 'You clicked the Primary Button.')} className="panel-button primary" component="button">
						I've talked to him
					</Tappable>
				</UI.ViewContent>
			</UI.View>
		);
	}
});
