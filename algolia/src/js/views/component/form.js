var React = require('react'),
	SetClass = require('classnames'),
	Tappable = require('react-tappable'),
	Navigation = require('touchstonejs').Navigation,
	Link = require('touchstonejs').Link,
	UI = require('touchstonejs').UI;

module.exports = React.createClass({
	mixins: [Navigation],

	getInitialState: function () {
		return {
			flavour: 'strawberry'
		}
	},

	handleFlavourChange: function (newFlavour) {

		this.setState({
			flavour: newFlavour
		});

	},

	handleSwitch: function (key, event) {
		var newState = {};
		newState[key] = !this.state[key];

		this.setState(newState);
	},

	render: function () {

		return (
			<UI.View>
				<UI.Headerbar type="default" label="Form">
					<UI.HeaderbarButton showView="home" viewTransition="reveal-from-right" label="Back" icon="ion-chevron-left" />
				</UI.Headerbar>
				<UI.ViewContent grow scrollable>
					<div className="panel-header text-caps">Find an expert</div>
					<div className="panel">
						<UI.LabelSelect label="Skill" value={this.state.flavour} onChange={this.handleFlavourChange} options={[
							{ label: 'reactJs',    value: 'reactjs' },
						]} />
						<UI.LabelInput label="City" type="search" defaultValue="Paris" placeholder="Paris" />
					</div>
				</UI.ViewContent>
			</UI.View>
		);
	}
});
