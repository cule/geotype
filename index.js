#!/usr/bin/env node
var turf = require('turf');
var flatten = require('geojson-flatten');
var tileCover = require('tile-cover');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var colors = require('colors/safe');
var normalize = require('geojson-normalize');

var fc = flatten(normalize(JSON.parse(fs.readFileSync(argv._[0]))));
if(argv.h || argv.help){
  docs();
}
else {
  var zoom;
  if(argv.z) zoom = parseFloat(argv.z);
  if(argv.zoom) zoom = parseFloat(argv.zoom);
  var border = 1
  if(argv.b) border = argv.b;
  if(argv.border) border = argv.border;
  if(!zoom>0) {
    var bbox = turf.extent(fc)
    var found = false;
    var z = 3;
    while(!found && z < 28){
      // x fit
      var lineTilesX = tileCover.tiles(
          turf.linestring([[bbox[0], bbox[1]], [bbox[2], bbox[1]]]).geometry,
          {min_zoom: z, max_zoom: z}
        )
      var lineXs = lineTilesX.map(function(t){return t[0]; });
      var lineMinX = lineXs.reduce(function(a, b){
        if(a < b) return a;
        else return b;
      })
      var lineMaxX = lineXs.reduce(function(a, b){
        if(a > b) return a;
        else return b;
      })
      var diffX = lineMaxX - lineMinX;

      // y fit
      var lineTilesY = tileCover.tiles(
          turf.linestring([[bbox[0], bbox[1]], [bbox[0], bbox[3]]]).geometry,
          {min_zoom: z, max_zoom: z}
        )
      var lineYs = lineTilesY.map(function(t){return t[1]; });
      var lineMinY = lineYs.reduce(function(a, b){
        if(a < b) return a;
        else return b;
      })
      var lineMaxY = lineYs.reduce(function(a, b){
        if(a > b) return a;
        else return b;
      })
      var diffY = lineMaxY - lineMinY;

      if (diffX > 30 || diffY > 23) {
        found = true;
        zoom = z;
      }
      z++;
    }
  }
  var map = '';
  var tiles = [];
  fc.features.forEach(function(f) {
    tiles = tiles.concat(tileCover.tiles(f.geometry, {min_zoom: zoom, max_zoom: zoom}));
  });

  var xs = tiles.map(function(t){return t[0]; });
  var ys = tiles.map(function(t) { return t[1]; });
  var minX = xs.reduce(function(a, b){
    if(a < b) return a;
    else return b;
  })
  var minY = ys.reduce(function(a, b){
    if(a < b) return a;
    else return b;
  })
  var maxX = xs.reduce(function(a, b){
    if(a > b) return a;
    else return b;
  })
  var maxY = ys.reduce(function(a, b){
    if(a > b) return a;
    else return b;
  })
  minX -= border;
  minY -= border;
  maxX += border;
  maxY += border;

  var tileHash = {}
  tiles.forEach(function(tile){
    tileHash[tile[0]+'/'+tile[1]] = true;
  })

  var x = minX;
  var y = minY;
  while(y <= maxY) {
    while(x <= maxX) {
      if(tileHash[x+'/'+y]) {
        map+=colors.green.bgGreen('XX');
      }
      else map+=colors.bgBlue('  ');
      x++;
    }
    map+='\n'
    x = minX;
    y++;
  }

  console.log(map);
}

function docs(){
  console.log('geotype\n===\n');
  console.log('geotype [file]\n');
  console.log('-z --zoom (OPTIONAL): specify fixed tile zoom level\n');
  console.log('-b --border (OPTIONAL): number of tiles to pad sides of frame\n');
  console.log('--nocolor (OPTIONAL): display plain ascii w/o colors\n');
  console.log('-h --help: show docs\n');
}