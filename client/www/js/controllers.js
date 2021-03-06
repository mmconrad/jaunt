'use strict';

angular.module('starter.controllers', ['ngSanitize'])

//////////////////////////////
// MAP PAGE CONTROLLER
//////////////////////////////

.controller('MapCtrl', function($scope, $ionicLoading, $ionicActionSheet, $timeout, $ionicModal, Jaunts, $q, $rootScope) {

  $scope.initialize = function () {

    // create the map by first setting map options
    var mapOptions = {
      center: new google.maps.LatLng(37.7833, -122.4167),
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      draggableCursor:'grab',
      mapTypeControl: false,
      panControl: false,
      zoomControl: false,
      streetViewControl: false,
      styles: [{"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"color":"#f7f1df"}]},{"featureType":"landscape.natural","elementType":"geometry","stylers":[{"color":"#d0e3b4"}]},{"featureType":"landscape.natural.terrain","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"poi.business","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"poi.medical","elementType":"geometry","stylers":[{"color":"#fbd3da"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#bde6ab"}]},{"featureType":"road","elementType":"geometry.stroke","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffe15f"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#efd151"}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"road.local","elementType":"geometry.fill","stylers":[{"color":"black"}]},{"featureType":"transit.station.airport","elementType":"geometry.fill","stylers":[{"color":"#cfb2db"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#a2daf2"}]}]
    };

    // instantiate new map using the options above
    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    $scope.userMarker = {};   // object to track and display user's location on map
    $scope.watchId = null;    // variable needed for geolocation object to track location
    $scope.polys = [];        // array of polylines showing tour route
    $scope.markers = [];      // array of tour starting point markers
    $scope.stopovers = [];    // array of stops on each tour
    $scope.infowindows = [];  // array for pop-up windows of info for each tour
    $scope.index = 0;
    $scope.query = {};  //user queries
    $scope.queryObj = {}; //sent to the db

    $scope.centerOnMe()
    .then(function (pos) {
      console.log('centerOnMe returned and continued')
      $scope.center = $scope.map.getCenter();
      $scope.show(0);
      $scope.placeUser();
    });
  };

  $scope.placeUser = function() {
    console.log('placeUser called')
    // get position if $rootScope.pos hasn't been set:
      // NOTE: $rootScope used for persistence across controllers 
    if (!$rootScope.pos) {
      console.log('no $rootScope.pos found');
      navigator.geolocation.getCurrentPosition(function (pos) {
        $rootScope.pos = pos;
        // format the position for the marker
        $rootScope.latLng = new google.maps.LatLng($rootScope.pos.coords.latitude, pos.coords.longitude);
        $scope.createUserMarker();
      });
    } else {
      console.log('found rootScope.pos in placeUser:', $rootScope.pos);
      $rootScope.latLng = new google.maps.LatLng($rootScope.pos.coords.latitude, $rootScope.pos.coords.longitude); 
      $scope.createUserMarker();
    }
    $scope.watchId = navigator.geolocation.watchPosition($scope.moveUser);
  };

  $scope.createUserMarker = function() {
    console.log('Jaunty created');
    $scope.userMarker = new google.maps.Marker({
      position: $rootScope.latLng,
      map: $scope.map,
      title: 'You are here',
      icon: '/img/jaunty_tiny.png',
    });
  };

  // called whenever HTML5 geolocation updates position
  $scope.moveUser = function() {
    navigator.geolocation.getCurrentPosition(function (pos) {
      $rootScope.pos = pos;
      $rootScope.latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      $scope.userMarker.setPosition(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
    });
    // Check for a stop nearby when you're within a jaunt started
    if ($scope.jauntStarted) {
      $scope.checkForStop();
    }
  };

  // find out if a stop on the tour is nearby -- if tour started and user has moved
  $scope.checkForStop = function () {
    var userX = $rootScope.pos.D;    // coords.longitude;
    var userY = $rootScope.pos.k;    // coords.latitude;
    var stopovers = $scope.selectedJaunt.stops;

    for (var i = 0; i < stopovers.length; i++) {
      var stopX = stopovers[i].location.coordinates[0];
      var stopY = stopovers[i].location.coordinates[1];
      // console.log('stopover location:', stopX, stopY);

      var degreeDist = Math.sqrt( Math.pow( (userX - stopX), 2 ) + Math.pow( (userY - stopY), 2) );
      // console.log('distance:', degreeDist);

      var meterDist = Jaunts.degreesToMeters(degreeDist);
      console.log('distance in meters:', meterDist);

      if (meterDist < 40) {
        console.log("You've reached", stopovers[i].name);

        // TRIGGER NAVIGATE TO PLACE DETAIL PAGE WHEN WITHIN CERTAIN DISTANCE

        window.location = 'http://localhost:5000/#/tab/jaunts/'+stopovers[i].jauntID+'/'+stopovers[i]._id;
      }
    }
  };

  // toggle whether user is actively on tour
  $scope.triggerStatus = function(){
    if ($scope.jauntStatus === "Start Jaunt") {
      $scope.jauntStatus = "End Jaunt";
    } else if ($scope.jauntStatus === "End Jaunt") {
      $scope.jauntStatus = "Start Jaunt";
    }
    console.log($scope.jauntStatus);
  }


  $scope.jauntAction = function() {
    if($scope.selectedJaunt && $scope.jauntStatus === "Start Jaunt") {
      $scope.startJaunt();
    } else if ($scope.selectedJaunt && $scope.jauntStatus === "End Jaunt") {
      $scope.endJaunt();
    }
  };

  // set variables and map position when user begins tour
  $scope.startJaunt = function() {
    $scope.jauntStarted = true;
    $scope.map.setZoom(16);
    $scope.triggerStatus();
    console.log('jaunt started');
  };

  // set variables and map position when user ends tour
  $scope.endJaunt = function() {
    $scope.jauntStarted = false;
    $scope.map.setZoom(14)
    $scope.triggerStatus();
    console.log("jaunt ended")
  };

  $scope.clickCrosshairs = function (){
    $scope.center = $scope.map.getCenter();
    $scope.show($scope.index);
  };

  // method to set map location based on user location
  $scope.centerOnMe = function () {
    return $q(function(resolve, reject) {
      if (!$scope.map) {
        reject('No map loaded');
      }

      $ionicLoading.show({
        template: '<i class="ion-loading-c"></i><div>Getting Location</div>',
        animation: 'fade-in',
        showBackdrop: false,
        maxWidth: 200
      });

      navigator.geolocation.getCurrentPosition(function (pos) {
        console.log('centerOnMe got pos', pos);
        $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        $ionicLoading.hide();
        resolve(pos);
      }, function (error) {
        reject('Unable to get location: ' + error.message);
      });
    });
  };


  //calls Jaunts.getAllPolys to receive an array of polylines; loops through to attach to map
  $scope.show = function(index){

    var query = {};
    var coordinates = [$scope.center.lng(), $scope.center.lat()];
    removeFromMap($scope.polys);
    removeFromMap($scope.markers);

    //if statement sets up the query.
    if(index === 0){
      query.start_location = {
        coordinates: coordinates,
        range: 1000
      };
    } else if(index === 1){
      query.end_location = {
        coordinates : coordinates,
        range: 1000
      };
    } // else if(index === 2){              // choice inactive as of now
      // console.log('do some stuff for choice 3');
    // }

    //the db call
    for(var key in $scope.queryObj){
      query[key] = $scope.queryObj[key];
    }

    $ionicLoading.show({
      template: '<i class="ion-loading-c"></i><div>Finding Jaunts</div>',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
    });

    hideMarkers();

    Jaunts.selectJaunts(query).then(function(data) {
      setTimeout( $ionicLoading.hide, 500);

      $scope.jaunts = data.data;
      //places on rootScope to persist across controllers
      $rootScope.jaunts = data.data;
      $scope.polys = Jaunts.getAllPolys($scope.jaunts);

      addToMap($scope.polys);

      showMarkers();

    });

    // Remove the location listener calling moveUser()
    // navigator.geolocation.clearWatch($scope.watchId);
  };

  var hideMarkers = function(){
    for(var i = 0; i < $scope.infowindows.length; i++){
      $scope.infowindows[i].close();
      $scope.markers[i].setMap(null);
    }
    $scope.markers.length = 0;
    $scope.infowindows.length = 0;
  }

  var markerMaker = function(lat, lng, title, icon, stops, jaunt){
    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(lat,lng),
      map: $scope.map,
      title: title,
      icon: icon,
      animation: google.maps.Animation.DROP,
      stops: stops,
      jaunt: jaunt
    })
    return marker;
  };


  var startContentString = function(id, title, rating, votes) {
    var contentString = '<div class="infoW">'+
            '<a href="/#/tab/jaunts/' +
            id +
            '">' +
            '<h5 class="title">' +
            title +
            '</h5>' +
            '<img src="/img/' +
            rating +
            '.png" class="rating"' +
            '>' +
            '<small> via ' +
            votes +
            ' votes</small>' +
            '</a>' +
            '</div>' /* closes infoW container*/;
    return contentString;
  };
  var stopoverContentString = function(jauntID, id, title) {
    var contentString = '<div class="infoW">'+
            '<a href="/#/tab/jaunts/' +
            jauntID + '/' + id +
            '">' +
            '<h5 class="title">' +
            title +
            '</h5>' +
            '</a>' +
            '</div>' /* closes infoW container*/;
    return contentString;
  };

  var getJauntInfoForWindow = function(jaunt) {
    return [jaunt._id, jaunt.meta.title, Math.round(jaunt.meta.rating), jaunt.meta.votes];
  };

  var createInfoWindow = function(jaunt){
    var infowindow = new google.maps.InfoWindow({
        content: startContentString.apply(null, getJauntInfoForWindow(jaunt)),
        pixelOffset: new google.maps.Size(0, -60)
    });
    return infowindow;
  };

  var createStartMarker = function(jaunt) {
    var startIcon = '/img/star.png'
    var lat = jaunt.start_location.coordinates[1];
    var lng = jaunt.start_location.coordinates[0];
    var title = jaunt.meta.title;
    var stops = jaunt.stops;
    var jaunt = jaunt;
    return markerMaker(lat, lng, title, startIcon, stops, jaunt);
  };

  var stopMarkerMaker = function(lat, lng, title, icon, id, jauntID){
    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(lat,lng),
      map: $scope.map,
      title: title,
      icon: icon,
      animation: google.maps.Animation.DROP,
      id: id,
      jauntID: jauntID
    })
    return marker;
  };

  var createStopsMarker = function(stop) {
    var whiteBoneIcon = '/img/white-bone-25.png';
    var coordinates = stop.location.coordinates;
    var lat = coordinates[1];
    var lng = coordinates[0];
    var title = stop.name;
    var id = stop._id
    var jauntID = stop.jauntID
    return stopMarkerMaker(lat, lng, title, whiteBoneIcon, id, jauntID);
  };


  var showMarkers = function(){

    var connectWindowAndMarker = function(marker, infowindow) {
      google.maps.event.addListener(marker, 'click', function(event) {
        // stop animation of other markers
        $scope.markers.forEach(function(otherMarker) {
          if (otherMarker !== marker) {
            otherMarker.setAnimation(null);
            otherMarker.setMap(null);
          }
        });

        $scope.jauntStatus = "Start Jaunt";
        $scope.$apply(function(){
          $scope.selectedJaunt = marker.jaunt;
        })
        $rootScope.selectedJaunt = marker.jaunt;

        removeFromMap($scope.stopovers);
        $scope.infowindows.forEach(function(InfoWindow) {
          InfoWindow.close();
        })
        if (marker.jaunt) {
          $scope.polys.forEach(function(poly) {
            var jaunt = marker.jaunt;
            var jauntID = jaunt._id;
            if (poly.jauntID !== jauntID) {
              removeFromMap([poly])
            }
          });
        }
        var stops = marker.stops;
        if (stops) {
          for (var j = 0; j < stops.length; j++) {
            var stop = stops[j];
            if (stop) {
              stop.jauntID = marker.jaunt._id
              var stopover = createStopsMarker(stop);
              $scope.stopovers.push(stopover)

              var infowindow2 = new google.maps.InfoWindow({
                  content: stopoverContentString(stopover.jauntID, stopover.id, stopover.title),
                  pixelOffset: new google.maps.Size(0, -60)
              });

              $scope.infowindows.push(infowindow2);
              // connectWindowAndMarker(stopover, infowindow2)
              var connect = function (infowindow2){
                google.maps.event.addListener(stopover, 'click', function(event) {
                  removeFromMap($scope.infowindows);
                  infowindow2.setPosition(event.latLng);
                  infowindow2.open($scope.map);
                })
              }(infowindow2);
            }
          }
        }

        marker.setAnimation(google.maps.Animation.BOUNCE);
        infowindow.setPosition(event.latLng);
        infowindow.open($scope.map);
      })

      google.maps.event.addListener(infowindow, 'closeclick', function(event) {
          marker.setAnimation(null);
          // removeFromMap($scope.polys);
          // removeFromMap($scope.markers);
          // removeFromMap($scope.stopovers);
          removeFromMap($scope.infowindows);
          // addToMap($scope.polys);
          // addToMap($scope.markers);
      });

      google.maps.event.addListener($scope.map, 'click', function(event) {
        if (!$scope.jauntStarted) {
          marker.setAnimation(null);
          infowindow.close();
          $scope.$apply(function(){
            $scope.selectedJaunt = null;
          })
          $rootScope.selectedJaunt = null;
          removeFromMap($scope.polys);
          removeFromMap($scope.markers);
          removeFromMap($scope.stopovers);
          removeFromMap($scope.infowindows);
          addToMap($scope.polys);
          addToMap($scope.markers);
        }
      });

    };

    for(var i = 0; i < $scope.jaunts.length; i++){
      var jaunt = $scope.jaunts[i];
      var infowindow = createInfoWindow(jaunt);
      var marker = createStartMarker(jaunt);

      $scope.markers.push(marker);
      $scope.infowindows.push(infowindow);


      connectWindowAndMarker(marker, infowindow);

    }
    console.log($scope.markers);
  };

  var addToMap = function(items){
    for(var i = 0; i < items.length; i++){
      items[i].setMap($scope.map);
    }
  };

  var removeFromMap = function(items){
    for(var i = 0; i < items.length; i++){
      items[i].setMap(null);
    }
  };

  // add modal for filtering
  $ionicModal.fromTemplateUrl('templates/filter.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal = function() {
      $scope.modal.show();
    };
    $scope.closeModal = function() {
      $scope.modal.hide();
    };
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });
    // Execute action on hide modal
    $scope.$on('modal.hidden', function() {
      // Execute action
    });
    // Execute action on remove modal
    $scope.$on('modal.removed', function() {
      // Execute action
    });


  if (!$scope.map) {
    $scope.initialize();
  }

  $scope.buildQuery = function(){
    $scope.queryObj = {};

    $scope.modal.hide();
    if($scope.query.tags){
      var mytags = $scope.query.tags.split(',');
      for(var i = 0; i < mytags.length; i++){
        mytags[i] = mytags[i].toLowerCase();
      }
      $scope.queryObj.tags =  mytags;

    }
    if($scope.query.duration){
      var duration = {max: $scope.query.duration};
      $scope.queryObj.duration = duration;
    }
    if($scope.query.food || $scope.query.drinks || $scope.query.activities || $scope.query.sights){
      $scope.queryObj.categories = [];

      if($scope.query.food){
        $scope.queryObj.categories.push('food');
      }
      if($scope.query.drinks){
        $scope.queryObj.categories.push('drinks');
      }
      if($scope.query.activities){
        $scope.queryObj.categories.push('activities');
      }
      if($scope.query.sights){
        $scope.queryObj.categories.push('sights');
      }
    }

    console.log($scope.queryObj);
    $scope.show($scope.index);

  };

  $scope.clearFilter = function(){
    $scope.queryObj = {};
    $scope.modal.hide();
    $scope.query = {};
    $scope.show($scope.index);

  };

})


//////////////////////////////
// JAUNTS LIST PAGE CONTROLLER
//////////////////////////////

.controller('JauntsCtrl', function($scope, Jaunts, $ionicModal, $rootScope) {
// console.log('rootscope jaunts',$rootScope.jaunts);

  $ionicModal.fromTemplateUrl('templates/filter.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
// console.log('rootscope jaunts',$rootScope.jaunts);

    });
    $scope.openModal = function() {
      $scope.modal.show();
// console.log('rootscope jaunts',$rootScope.jaunts);

    };
    $scope.closeModal = function() {
      $scope.modal.hide();
    };
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });
    // Execute action on hide modal
    $scope.$on('modal.hidden', function() {
      // Execute action
    });
    // Execute action on remove modal
    $scope.$on('modal.removed', function() {
      // Execute action
    });
})


////////////////////////////////////////
// JAUNT INFO PAGE CONTROLLER
////////////////////////////////////////

.controller('JauntDetailCtrl', function($scope, $stateParams, Jaunts, $rootScope) {
  $scope.jaunt = Jaunts.getJaunt($rootScope.jaunts, $stateParams.jauntId);
})



////////////////////////////////////////
//  NAVIGATION PAGE CONTROLLER
////////////////////////////////////////

.controller('NavigateCtrl', function($scope, $ionicLoading, $ionicActionSheet, $timeout, $ionicModal, Jaunts, $q, $rootScope) {

})




<<<<<<< HEAD
=======

>>>>>>> 2970742fee0a8149cd7023325c051846e34d8992
.controller('PlaceDetailCtrl', function($scope, $stateParams, Jaunts, $rootScope) {

  $scope.stop = Jaunts.getStop($rootScope.jaunts, $stateParams.jauntId, $stateParams.placeId);
  console.log('$scope.stop.audioUrl');
  console.log($scope.stop.audioUrl);
  $scope.stop.audioUrl = $sce.trustAsResourceUrl($scope.stop.audioUrl);
})





.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
})





.controller('HomeCtrl', function($scope, $rootScope, $state, Jaunts) {
  $scope.settings = {
    enableFriends: true
  };

  //get initial position
  navigator.geolocation.getCurrentPosition(function (pos) {
    var query = {
      'start_location' : {
        'coordinates' : [
          pos.coords.longitude,
          pos.coords.latitude
        ],
        'range': 1000
      }
    };

    //set position coordinates in rootScope
    $rootScope.pos = pos;



    Jaunts.selectJaunts(query).then(function(data){
      $scope.jaunts = data.data;

      //places on rootscope to persist across controllers
      $rootScope.jaunts = data.data;
      console.log($rootScope.jaunts[0]);
    });
  }, function (error) {
    console.log('Unable to get location: ' + error.message);
  });

  setTimeout(function(){
    angular.element( document.querySelector( 'div.home' ) ).addClass('fade');
    angular.element( document.querySelector( '.background' ) ).addClass('fade');
    setTimeout(function() {
      $state.go('tab.jaunts');
    }, 400);
  }, 2500);
});
