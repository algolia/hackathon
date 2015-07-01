var React = require('react');
var Tappable = require('react-tappable');
var Navigation = require('touchstonejs').Navigation;
var Link = require('touchstonejs').Link;
var UI = require('touchstonejs').UI;
var SetClass = require('classnames');

var algoliasearch = require('algoliasearch');
var algoliasearchHelper = require('algoliasearch-helper');

var Timers = require('react-timers');

var People = require('../../data/people');

var ComplexListItem = React.createClass({
	mixins: [Navigation],


	render: function () {
		var initials = this.props.user.login.charAt(0).toUpperCase();
				//<UI.ItemMedia avatarInitials={initials} />

		return (
			<Link to="details" viewTransition="show-from-right" params={{ user: this.props.user, prevView: 'component-complex-list' }} className="list-item" component="div">
				<div className="item-inner">
					<div className="item-content">
						<div className="item-title">{this.props.user.name||this.props.user.login}</div>
						<div className="item-subtitle">{this.props.user.company||""}</div>
						<div className="item-subtitle">{this.props.user.location||""}</div>
					</div>
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
  getInitialState : function(){
    return {
      users : []
    }; 
  },

  render: function () {
    return (
      <UI.View>
        <UI.Headerbar type="default" height="36px" className="Headerbar-form Subheader">
          <UI.HeaderbarButton showView="component-form" viewTransition="reveal-from-left" 
                              className="Headerbar-button right" label="Settings" />
        </UI.Headerbar>
        <UI.ViewContent grow scrollable>
          <ComplexList users={this.state.users} helper={this.helper}/>
        </UI.ViewContent>
      </UI.View>
    );
  },
  componentWillMount : function() {
    var self = this;
    var client = algoliasearch( "TLCDTR8BIO", "10f3624c5d165d40f59164930dce8799");
    var helper = algoliasearchHelper( client, "users", {} );
    helper.on( "result", function( results, parameters ) {
      self.setState( {
        users : results.hits
      } ); 
    } );
    this.helper = helper;
    helper.search();
  }
});
