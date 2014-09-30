var Board = Backbone.Collection.extend({
  model: BoardTile
});;var BoardTile = Backbone.Model.extend({
});;var BoardTileView = Backbone.View.extend({
  tagName: 'div',
  className: 'battle-tile',
  initialize: function() {
    if (this.model === undefined) {
      console.log(undefined);
    }
    this.render();
    this.model.on('change', this.render());
  },
  render: function() {
    var subType = this.model.get('subType');
    var type = this.model.get('type');
    var teamId = this.model.get('team');
    if (subType !== 'Unoccupied') {
      var assets = {
        Tree: '../img/tree.png',
        Adventurer: '../img/bkknight.png',
        BlackKnight: '../img/black-knight.png',
        DiamondMine: '../img/diamond.png',
        HealthWell: '../img/pot.png',
        Bones: '../img/grave.png'
      };
      var html = '<img src="' + assets[subType] + '" class="sprite">';
        var colors = {
          0: "team-yellow",
          1: "team-blue"
        };
      if (type === 'Hero') {
        var name = this.model.get('name');
        var heroId = this.model.get('battleId');
        var HP = this.model.get('health');
        var gameTurn = this.model.get('gameTurn');
        var lastActiveTurn = this.model.get('lastActiveTurn');
        if(lastActiveTurn === (gameTurn - 1) && gameTurn !== 1){
          this.$('.sprite').addClass('current-turn');
        }
        html = '<img src="' + assets[subType] + '" id="H' + heroId +'" class="sprite">';
        
        html += '<span class="indicator ' + colors[this.model.get('team')] +'">' + heroId + '</span>';
        html += '<span class="lifebar"><span class="life-capacity" style="height:' + HP + '%"></span></span>';
        this.$el.addClass('current-user-' + name);
      } else if (type === 'DiamondMine') {
        var owner = this.model.get('owner');
        if (owner) {
          html += '<span class="indicator ' + colors[owner.team] +'">' + owner.id + '</span>';
        } 
      }
      this.$el.html(html);
    }
  }
});;var BoardView = Backbone.View.extend({
  tagName: 'section',
  className: 'battle-map',
  initialize: function() {
    this.render()
  },
  render: function() {
    this.$el.html('');
    this.createBoardView();
  },
  createBoardView: function() {
    var boardLength = this.collection.lengthOfSide;
    for(var i = 0; i < boardLength; i++){
      var $tr = $('<div class="tile-row">');
    	for(var j = 0; j < boardLength; j++){
        var tileView = new BoardTileView({
    			model: this.collection.at(i * boardLength + j)          
    		});
    	  $tr.append(tileView.$el);
    	}
    	this.$el.append($tr);
    }
  }
});
;
var Game = Backbone.Model.extend({

  clientSideGame: {},

  helpers: {},

  setupGame: function(game, boardSize) {
    var randomNumber = function(max) {
      return Math.floor(Math.random()*max);
    };

    for (var i=0; i<8; i++) {
      while (!game.addHero(randomNumber(boardSize), randomNumber(boardSize), 'random', 0)) {
        //Loops until each hero is successfully added
      }
    }

    for (var i=0; i<8; i++) {
      while (!game.addHero(randomNumber(boardSize), randomNumber(boardSize), 'random', 1)) {
        //Loops until each hero is successfully added
      }
    }
    for (var i=0; i<6; i++) {
      game.addHealthWell(randomNumber(boardSize), randomNumber(boardSize));
    }
    for (var i=0; i<18; i++) {
      game.addImpassable(randomNumber(boardSize), randomNumber(boardSize));
    }
    for (var i=0; i<12; i++) {
      game.addDiamondMine(randomNumber(boardSize), randomNumber(boardSize));
    }

  },

  runGame: function() {
    if (this.get('heroCode') === undefined) {
      alert('Please upload your Hero.js file first.');
      return 'Error';
    } else {
      this.waiting = true;

      var move = this.get('heroCode');
      var start = move.indexOf('module.exports = move');
      move = move.slice(0, move.length - 26);
      move += "return move(arguments[0], arguments[1]);";

      var helpers = this.helpers;

      var gameData = this.clientSideGame[0];
      this.setupGame(gameData, gameData.board.lengthOfSide);
      var handleHeroTurn = gameData.handleHeroTurn;
      var turnKeeper = 0;
      while (turnKeeper < 1300) {
        if (gameData.heroTurnIndex === 0) {
          var usersFunction = new Function(move);
          var usersMove = usersFunction(gameData, helpers);
          handleHeroTurn.call(gameData, usersMove);
          var newGameData = JSON.parse(JSON.stringify(gameData));
          this.clientSideGame[turnKeeper] = newGameData;
        } else {
          var choices = ['North', 'South', 'East', 'West'];
          handleHeroTurn.call(gameData, choices[Math.floor(Math.random()*4)]); 
          var newGameData = JSON.parse(JSON.stringify(gameData));
          this.clientSideGame[turnKeeper] = newGameData;
        }
        turnKeeper++;
      }
      var copiedGame = JSON.parse(JSON.stringify(this.clientSideGame[0]));
      this.gameSet(copiedGame);
      this.trigger('finished');
    }
  },

  initialize: function() {
    var userModel = new User();
    this.set('userModel', userModel);
  },
  
  gameSet: function(gameData) {
    this.set('turn', gameData.turn);
    this.set('maxTurn', gameData.maxTurn);
    this.set('moveMessages', gameData.moveMessage);
    this.set('winningTeam', gameData.winningTeam);
    this.set('attackMessages', gameData.attackMessage);
    this.set('killMessages', gameData.killMessage);
    this.set('teamDiamonds', gameData.totalTeamDiamonds);
    var teamYellow = new Team();
    var teamBlue = new Team();
    var board = new Board();

    board.lengthOfSide = gameData.board.lengthOfSide;

    //add team yellow hero Models to team collection
    _.each(gameData.teams[0], function(heroObject, key, col){
      heroObject.gameTurn = gameData.turn;
      heroObject.battleId = heroObject.id;
      if (heroObject.id === 0) {
        heroObject.name = 'YOUR HERO'
      }
      delete heroObject.id;

      var hero = new Hero(heroObject);
      teamYellow.add(hero);
    });
    //add team blue hero Models to team collection
    _.each(gameData.teams[1], function(heroObject){
      heroObject.gameTurn = gameData.turn;
      heroObject.battleId = heroObject.id;
      if (heroObject.id === 0) {
        heroObject.name = 'YOUR HERO'
      }
      delete heroObject.id;

      var hero = new Hero(heroObject);
      teamBlue.add(hero);
    });

    

    _.each(_.flatten(gameData.board.tiles), function(tileObject, key, list) {
      //The id from our game model was overwriting 
      tileObject.battleId = tileObject.id;
      delete tileObject.id;
      tileObject.gameTurn = this.get('turn');
      var tile = new BoardTile(tileObject);
      board.add(tile);

    }.bind(this));

    this.set('teamYellow', teamYellow);
    this.set('teamBlue', teamBlue);
    this.set('board', board);
  },

  updateTurn: function(turn) {
    var copiedGame = JSON.parse(JSON.stringify(this.clientSideGame[turn]));
    this.gameSet(copiedGame);
  }
});;var GameView = Backbone.View.extend({
  tagName: 'div',
  className: 'outer',
  initialize: function(){
    this.$el.html('<br><div class="centered"><img class="start-screen" src="../../img/start-screen.png"></div>');
    this.model.on('finished', function() {
      this.paused = true;
      this.playInProgress = false;
      this.sliderInitialized = false; 
      this.$el.html('<div class="messages"></div>' + '<div class="row map"></div>');
      this.$el.append('<input class="row slider" />' +
                      '</div>');
      this.$el.append('<div class="row play-controls">' +
                        '<span class="play-pause-game glyphicon glyphicon-play">' +
                        '</span>' +
                        '<span class="restart-game glyphicon glyphicon-repeat">' +
                        '</span>' +
                      '</div>');
      this.$el.append('<span class="turn"></span>');
      this.render();
    }, this);
  },
  events: {
    'click .play-pause-game': 'togglePlayGame',
    'click .restart-game': 'restartGame'
  },
  render: function(){
    this.checkWinner();
    this.initializeSlider();
    var $gameHtml = this.$el.find('.map');
    $gameHtml.html('');
    //Show game update messages
    $('.messages').text('');
    $('.messages').append(this.model.get('killMessages'));
       //Add html for team info
    var yellowTeamView = new TeamView({
      collection: this.model.get('teamYellow'),
      className: 'team-info t-yellow',
    });
    yellowTeamView.teamColor = 'Team Yellow';
    yellowTeamView.diamonds = this.model.get('teamDiamonds')[0];
    yellowTeamView.render();
    var blueTeamView = new TeamView({
      collection: this.model.get('teamBlue'),
      className: 'team-info t-blue'
    });
    blueTeamView.teamColor = 'Team Blue';
    blueTeamView.diamonds = this.model.get('teamDiamonds')[1];
    blueTeamView.render();
    var boardView = new BoardView({collection: this.model.get('board')});
    //Add all board html
    $gameHtml.append(yellowTeamView.$el);
    $gameHtml.append(boardView.$el);
    $gameHtml.append(blueTeamView.$el);
    this.$el.find('#H0').after('<span class="arrow"></span>');
    this.$el.find('.turn').text('Turn: ' + this.model.get('turn'));
  },

  sendSliderToTurn: function(turn) {
    //The "track" the sword slides along
    var $rangeBar = this.$el.find('.range-bar');

    //The sword element
    var $rangeHandle = $rangeBar.find('.range-handle');

    //The "filled-in" left-hand side of the track
    var $rangeQuantity = $rangeBar.find('.range-quantity')

    //Calculate how far into the game we are
    var maxTurn = this.model.get('maxTurn');
    var percentageComplete = turn / maxTurn;


    var convertCssLengthToNumber = function(str) {
      return +(str.slice(0,-2));
    };

    //Calculate where to put the slider and slider quantity
    var totalWidth = convertCssLengthToNumber($rangeBar.css('width'));
    var handleWidth = convertCssLengthToNumber($rangeHandle.css('width'));
    var actualWidth = totalWidth - handleWidth;
    var newHandleLocation = percentageComplete * actualWidth;

    //Put the range handle and range quantity in the correct location
    $rangeHandle.css('left', newHandleLocation + 'px');
    $rangeQuantity.css('width', newHandleLocation + 'px');
  },
  initializeSlider: function() {
    //Only run this function once...this ensures that
    if (!this.sliderInitialized) {
      this.sliderInitialized = true;
    } else {
      return;
    }

    //Get slider
    var $slider = this.$el.find('.slider');
    var slider = $slider[0];

    var maxTurn = this.model.get('maxTurn');

    //Initialize new slider and set it to update
    //the turn on slide
    var init = new Powerange(slider, {
      min: 0,
      max: this.model.get('maxTurn'),
      step: 1,
      callback: function() {
        //Pause the game
        this.pauseGame();

        //Slider value will range from the min to max
        this.model.updateTurn(slider.value);
        this.render();

      }.bind(this)
    });

    //Allows users to change the turn with arrow keys
    $(document).keydown(function(e) {
      //Updates the turn
      var turn = this.model.get('turn') - 1;
      var maxTurn = this.model.get('maxTurn');
      if (e.which === 39) {
        turn++;
      } else if (e.which === 37) {
        turn--;
      } else {
        //does nothing
        return;
      }

      //Will only get here if an arrow key is pressed
      //Pauses the game, then goes to the turn specified
      this.pauseGame();


      //Adjusts the turn, but doesn't go below 0 or above the max turn
      var newTurn = Math.max(Math.min(turn, maxTurn),1);

      //Updates the model
      this.model.updateTurn(newTurn);

      //Send slider to new location
      this.sendSliderToTurn(newTurn);
      this.render();

    }.bind(this));
  },
  restartGame: function() {
    this.pauseGame();

    //Send slider and game to turn 0
    this.model.updateTurn(0);
    this.sendSliderToTurn(0);
    this.render();
  },
  pauseGame: function() {
    this.paused = true;

    //Change pause button to a play button
    var $playPause = this.$el.find('.play-pause-game');
    $playPause.removeClass('glyphicon-pause');
    $playPause.addClass('glyphicon-play');
  },
  togglePlayGame: function() {
    this.paused = !this.paused;
    var $playPause = this.$el.find('.play-pause-game');
    if (this.paused) {
      //Change pause button to a play button
      $playPause.removeClass('glyphicon-pause');
      $playPause.addClass('glyphicon-play');
    } else {
      //Change play button to a pause button
      $playPause.removeClass('glyphicon-play');
      $playPause.addClass('glyphicon-pause');

      //Start auto-playing the game
      this.autoPlayGame();
    }
  },
  autoPlayGame: function() {
    //Store the current turn and the turn at which
    //the game will end
    var currTurn = this.model.get('turn');

    var maxTurn = this.model.get('maxTurn');

    //If the game is not yet over, go to next turn
    if (currTurn < maxTurn && this.paused === false) {
      //Keeps track of whether we are waiting for the promise
      //to resolve (used to prevent issues with users doubleclicking)
      //the play button
      this.model.updateTurn(currTurn);
      this.sendSliderToTurn(currTurn);
      this.render();
      currTurn++;

      // Hacky solution to fix the rendering bug
      // Backbone could not keep up with rendering all these model changes
      var that = this;
      window.setTimeout(function(){
        that.autoPlayGame();
      }, 300);

      //Updates the slider location to track with the current turn
      // this.sendSliderToTurn(currTurn + 1);

      //Runs this again (will run until no turns are left or
      //until paused)
    }  
  },
  checkWinner: function() {
    var winner = this.model.get('winningTeam'); 
    var message = $('.winner-msg');
    if (winner === 0) {
      message.text('Yellow Team Wins!');
    } else if (winner === 1) {
      message.text('Blue Team Wins!');

    } else {
      message.text('Simulated Game');
    }
  }
});
;var NavbarView = Backbone.View.extend({

  initialize: function(){
    this.render();
    $.when(this.model.fetch()).then(function() {
      this.render();
    }.bind(this));
  },

  render: function(){
    var html;
    var githubHandle = this.model.get('githubHandle');

    // if logged in
    if(githubHandle) {
      html = new EJS({url: '../ejs_templates/navbar'}).render(this.model);
    } else {
      html = new EJS({url: '../ejs_templates/navbarNotLoggedIn'}).render(this.model);
    }
    
    this.$el.html(html);
  }
});;var RulesView = Backbone.View.extend({
  
  initialize: function(){
    this.waiting = false;
    this.render();
  },

  events: {
    'click .simulate': 'simulate',
    'change #hero': 'getHeroCode'
  },

  simulate: function() {
    this.waiting = true;
    this.render();
    var that = this;
    window.setTimeout(function() {
      that.model.runGame();
      that.waiting = false;
      that.render();
    }, 500);
  },

  render: function(){
    var html = new EJS({url: '/ejs_templates/rules'}).render(this.model);
    var simulationHtml = '<button class="btn btn-success btn-lg">Simulate Game</button>';
    var waitingHtml = '<button class="btn btn-danger btn-lg">Waiting for Simulation to Finish</button>';

    this.$el.html(html);

    if (!this.waiting) {
      this.$el.find('.simulate').html(simulationHtml);
    }
    if (this.waiting) {
      this.$el.find('.simulate').html(waitingHtml);
    }
  },

  getHeroCode: function() {
    var reader = new FileReader();
    var heroCode = this.$el.find('#hero')[0].files[0];
    var that = this;
    reader.onload = function(e) {
      that.model.set('heroCode', reader.result);
    };
    reader.readAsText(heroCode);

  }


});;var SiteDownView = Backbone.View.extend({

  initialize: function(){
    this.render();
  },

  render: function(){
    var html = '<div class="site-down"><div class="row text-center"><h1 class="col-lg-12">Sorry, something went wrong</h1></div><div class="row"><img class="img-responsive" src="../../img/sad-knight.png"></div><div class="row text-center"><h3 class="col-lg-12">Please check back in a couple hours!</h4></div></div>';

    
    this.$el.html(html);
  }
});;/**
 * cbpAnimatedHeader.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
var cbpAnimatedHeader = (function() {

	var docElem = document.documentElement;
	var header = document.querySelector( '.navbar-fixed-top' );
	var didScroll = false;
	var changeHeaderOn = 300;

	function init() {
		window.addEventListener( 'scroll', function( event ) {
			if( !didScroll ) {
				didScroll = true;
				setTimeout( scrollPage, 250 );
			}
		}, false );
	}

	function scrollPage() {
	  var options = document.querySelector('.user-options');
		var sy = scrollY();
		if ( sy >= changeHeaderOn ) {
			classie.add( header, 'navbar-shrink' );
			if(options){
        classie.add( options, 'user-options-shrink');
			}
		}
		else {
			classie.remove( header, 'navbar-shrink' );
			if(options){
        classie.remove( options, 'user-options-shrink');
			}
		}
		didScroll = false;
	}

	function scrollY() {
		return window.pageYOffset || docElem.scrollTop;
	}

	init();

})();
;/*!
 * classie - class helper functions
 * from bonzo https://github.com/ded/bonzo
 * 
 * classie.has( elem, 'my-class' ) -> true/false
 * classie.add( elem, 'my-new-class' )
 * classie.remove( elem, 'my-unwanted-class' )
 * classie.toggle( elem, 'my-class' )
 */

/*jshint browser: true, strict: true, undef: true */
/*global define: false */

( function( window ) {

'use strict';

// class helper functions from bonzo https://github.com/ded/bonzo

function classReg( className ) {
  return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
}

// classList support for class management
// altho to be fair, the api sucks because it won't accept multiple classes at once
var hasClass, addClass, removeClass;

if ( 'classList' in document.documentElement ) {
  hasClass = function( elem, c ) {
    return elem.classList.contains( c );
  };
  addClass = function( elem, c ) {
    elem.classList.add( c );
  };
  removeClass = function( elem, c ) {
    elem.classList.remove( c );
  };
}
else {
  hasClass = function( elem, c ) {
    return classReg( c ).test( elem.className );
  };
  addClass = function( elem, c ) {
    if ( !hasClass( elem, c ) ) {
      elem.className = elem.className + ' ' + c;
    }
  };
  removeClass = function( elem, c ) {
    elem.className = elem.className.replace( classReg( c ), ' ' );
  };
}

function toggleClass( elem, c ) {
  var fn = hasClass( elem, c ) ? removeClass : addClass;
  fn( elem, c );
}

var classie = {
  // full names
  hasClass: hasClass,
  addClass: addClass,
  removeClass: removeClass,
  toggleClass: toggleClass,
  // short names
  has: hasClass,
  add: addClass,
  remove: removeClass,
  toggle: toggleClass
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( classie );
} else {
  // browser global
  window.classie = classie;
}

})( window );
;/*!
 * Start Bootstrap - Freelancer Bootstrap Theme (http://startbootstrap.com)
 * Code licensed under the Apache License v2.0.
 * For details, see http://www.apache.org/licenses/LICENSE-2.0.
 */

// jQuery for page scrolling feature - requires jQuery Easing plugin
$(function() {
    $('.page-scroll a').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });
});

// Floating label headings for the contact form
$(function() {
    $("body").on("input propertychange", ".floating-label-form-group", function(e) {
        $(this).toggleClass("floating-label-form-group-with-value", !! $(e.target).val());
    }).on("focus", ".floating-label-form-group", function() {
        $(this).addClass("floating-label-form-group-with-focus");
    }).on("blur", ".floating-label-form-group", function() {
        $(this).removeClass("floating-label-form-group-with-focus");
    });
});

// Highlight the top nav as scrolling occurs
$('body').scrollspy({
    target: '.navbar-fixed-top'
})

// Closes the Responsive Menu on Menu Item Click
$('.navbar-collapse ul li a').click(function() {
    $('.navbar-toggle:visible').click();
});;var Hero = Backbone.Model.extend({
});;var HeroView = Backbone.View.extend({
  className: 'list-group-item list-group-item-info score-info',
  tagName: 'li',
  initialize: function() {
    this.render();
  },
  render: function() {
    var heroId = this.model.get('battleId');
    var health = this.model.get('health');
    var name = this.model.get('name');
    var turn = this.model.get('gameTurn');
    var currentTurn = this.model.get('lastActiveTurn');

    if(health < 1){
      this.$el.removeClass('list-group-item-info').addClass('list-group-item-danger');
      health = 'Dead';
    } else{
      health =  health + 'HP';
    }
    var heroName = '<div class="hero-header h-i' + heroId + '">(id:' + heroId + ') ' + 
        '<span>' + name + '</span>' + ' </div>'
    var health = '<div class="health-info h-i' + heroId + '">' + health + '</div>';
    this.$el.append(heroName + health);
  }
});;var Team = Backbone.Collection.extend({
  model: Hero
});;var TeamView = Backbone.View.extend({
  className: 'list-group',
  tagName: 'div',
  teamColor: undefined,
  initialize: function(){
    // this.render();
  },
  render: function() {
    this.$el.html('');
    if(this.teamColor){
      this.$el.append('<h5 class="team-name">' + this.teamColor + ' diamonds: ' + this.diamonds + '</h5>');
    }
    this.createTeamView();
  },
  createTeamView: function() {
    _.each(this.collection.models, function(hero){
      var heroView = new HeroView({
        model: hero
      });
      this.$el.append(heroView.$el);
    }.bind(this));
  }
});;var User = Backbone.Model.extend({
  
  // give model url attribute for server to handle
  url: '/userInfo',

  // set id attribute so that we can do put requests
  // backbone looks for 'id' otherwise
  idAttribute: '_id'

});;var UserView = Backbone.View.extend({
  
  initialize: function() {
    this.viewing = {};
    this.viewing = "settings";
    this.render();
    // fetch will get object at model's url
    // can use 'parse' as middleware for object
    // jQuery promise
    $.when(this.model.fetch()).then(function() {
      this.render();
    }.bind(this));
  },

  events: {
    'submit': 'handleSubmit',
    'click .settings': 'showSettings',
    'click .recentStats': 'showRecent',
    'click .lifetimeStats': 'showLifetime',
    'click .averageStats': 'showAverage'
  },

  handleSubmit: function(event) {
    event.preventDefault();
    var val = this.$el.find('#inputRepo').val();
    var codeRepo = this.model.get('codeRepo');
    // do not process if an empty string or equal to current code repo
    if (val.length !== 0 && val !== codeRepo) {
      // update the model with the new form data
      // escape the form input for security
      this.model.set('codeRepo', _.escape(val));
      //Save the model
      this.model.save();
      this.render();
      // display form as updated with check mark and green highlight
      this.$el.find(".form-group").addClass("has-success");
      this.$el.find(".form-group").addClass("has-feedback");
    } else {
      // if empty string or equal to current code repo do not display as updated
      this.$el.find(".form-group").removeClass("has-success");
      this.$el.find(".form-group").removeClass("has-feedback");
      // render to get current code repo value displayed rather than empty string
      this.render();
    }
  },

  showSettings: function(event) {
    event.preventDefault();
    this.viewing = "settings";
    this.render();
    this.$el.find('.settings').tab('show');
  },
  
   showRecent: function(event) {
    event.preventDefault();
    this.viewing = "recent";
    this.render();
    this.$el.find('.recentStats').tab('show');
  },

   showLifetime: function(event) {
    event.preventDefault();
    this.viewing = "lifetime";
    this.render();
    this.$el.find('.lifetimeStats').tab('show');
  },

   showAverage: function(event) {
    event.preventDefault();
    this.viewing = "average";
    this.render();
    this.$el.find('.averageStats').tab('show');
  },

  render: function() {
    var githubHandle = this.model.get('githubHandle');
    var html;
    if (githubHandle && this.viewing === "settings") {
      html = new EJS({url: '/ejs_templates/settings'}).render(this.model);
    } else if (githubHandle && this.viewing === 'lifetime') {
      html = new EJS({url: '/ejs_templates/lifetime'}).render(this.model);
    } else if (githubHandle && this.viewing === 'recent') {
      html = new EJS({url: '/ejs_templates/recent'}).render(this.model);
    } else if (githubHandle && this.viewing === 'average') {
      var averageStats = this.model.average();
      averageStats['githubHandle'] = this.model.get('githubHandle');
      html = new EJS({url: '/ejs_templates/average'}).render(averageStats);
    } else if (!githubHandle) {
      html = new EJS({url: '/ejs_templates/notLoggedIn'}).render(this.model);
    }
    this.$el.html(html);
  }

});;var app = {};

app.game = new Game();

var initialGame = require('./game_classes/Game.js');
app.game.clientSideGame[0] = new initialGame(12);

app.game.helpers = require('./helpers.js');

app.gameView = new GameView({ model: app.game });
$('.gamegrid-content').append(app.gameView.$el);

app.user = new User();
app.userView = new UserView({ model: app.user });
$('#join').append(app.userView.$el);

app.navbarView = new NavbarView({ model: app.user });
$('.navbar').append(app.navbarView.$el);

app.rulesView = new RulesView({ model: app.game });
$('#rules').append(app.rulesView.$el);



