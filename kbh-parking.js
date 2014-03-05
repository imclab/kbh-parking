// Generated by CoffeeScript 1.6.3
(function() {
  var canvasTiles, loadRecent, map, maxLat, maxLng, minLat, minLng, now, parkomatCount, parkomatGet, parkomats, render, sinh, tile2coordZoom, updatePoints;

  desc.style.fontSize = window.innerHeight * .03 + "px";

  map = L.map('mapElem');

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  navigator.geolocation.getCurrentPosition(function(pos) {
    return L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);
  });

  map.setView([55.690, 12.5655300], 12);

  sinh = function(x) {
    return (Math.pow(Math.E, x) - Math.pow(Math.E, -x)) / 2;
  };

  tile2coordZoom = function(zoom) {
    return function(x, y) {
      var scale;
      scale = Math.pow(0.5, zoom);
      return [x * scale * 360.0 - 180.0, 180 / Math.PI * Math.atan(sinh(Math.PI * (1 - 2 * y * scale)))];
    };
  };

  canvasTiles = L.tileLayer.canvas();

  canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
    var ctx, d, dlat, dlng, dx, dy, im, lat, lng, maxDist, obj, parkomat, tile2coord, w, x, y, _, _i, _j, _k, _l, _ref;
    tile2coord = tile2coordZoom(zoom);
    if (false) {
      ctx = canvas.getContext("2d");
      im = ctx.getImageData(0, 0, 255, 255);
      w = im.width;
      for (y = _i = 0; _i <= 255; y = _i += 8) {
        for (x = _j = 0; _j <= 255; x = _j += 8) {
          _ref = tile2coord(tilePoint.x + x / 256, tilePoint.y + y / 256), lng = _ref[0], lat = _ref[1];
          d = 0;
          maxDist = 10000;
          parkomat = void 0;
          for (_ in points) {
            obj = points[_];
            dlng = obj.lng - lng;
            dlng *= dlng;
            dlat = obj.lat - lat;
            dlat *= dlat;
            if (dlat + dlng < maxDist) {
              maxDist = dlat + dlng;
              parkomat = obj;
            }
          }
          for (dx = _k = 0; _k <= 7; dx = ++_k) {
            for (dy = _l = 0; _l <= 7; dy = ++_l) {
              if (maxDist < 0.01) {
                im.data[4 * (x + dx + (y + dy) * w)] = parkomat.sampling * 256 / 40000;
                im.data[4 * (x + dx + (y + dy) * w) + 1] = parkomat.sampling * 256 / 40000;
                im.data[4 * (x + dx + (y + dy) * w) + 2] = parkomat.sampling * 256 / 40000;
                im.data[4 * (x + dx + (y + dy) * w) + 3] = 100;
              }
            }
          }
        }
      }
      return ctx.putImageData(im, 0, 0);
    }
    /*
    ctx = canvas.getContext "2d"
    setInterval (->
      ctx.fillRect Math.random() * 256, Math.random() * 256,3,3
    ), 1000
    */

  };

  canvasTiles.addTo(map);

  parkomatGet = function(offset, limit, fn) {
    return $.ajax({
      url: 'http://data.kk.dk/api/action/datastore_search',
      data: {
        resource_id: '660e19fa-8838-4a5c-9495-0d7f94fab51e',
        offset: offset,
        limit: limit
      },
      dataType: 'jsonp',
      success: function(data) {
        var _ref;
        return fn((_ref = data.result) != null ? _ref.records : void 0);
      }
    });
  };

  /*
  parkomatGet = (offset, limit, fn) ->
    $.ajax
      url: "sample100000latest.json"
      success: (data) ->
        console.log data
        fn(data.result?.records)
  */


  parkomatCount = function(fn) {
    return $.ajax({
      url: 'http://data.kk.dk/api/action/datastore_search_sql',
      data: {
        sql: 'SELECT COUNT (*) from "660e19fa-8838-4a5c-9495-0d7f94fab51e"'
      },
      dataType: 'jsonp',
      success: function(data) {
        return fn(+data.result.records[0].count);
      }
    });
  };

  loadRecent = function(fn) {
    return parkomatCount(function(n) {
      return parkomatGet(n - 70000, 70000, function(result) {
        return fn(result);
      });
    });
  };

  now = void 0;

  parkomats = void 0;

  minLat = 1000;

  minLng = 1000;

  maxLat = 0;

  maxLng = 0;

  updatePoints = function(fn) {
    var parkomat, _;
    for (_ in points) {
      parkomat = points[_];
      parkomat.used = 0;
    }
    return loadRecent(function(events) {
      var current, event, latest, missing, _i, _len;
      latest = events.reduce((function(a, b) {
        if (a.tlPayDateTime > b.tlExpDateTime) {
          return a;
        } else {
          return b;
        }
      }), {
        tlPayDateTime: ""
      });
      now = latest.tlPayDateTime;
      missing = 0;
      current = events.filter(function(e) {
        return (e.tlPayDateTime < now && now < e.tlExpDateTime);
      });
      for (_i = 0, _len = current.length; _i < _len; _i++) {
        event = current[_i];
        parkomat = points[event.tlPDM];
        if (parkomat) {
          ++parkomat.used;
        } else {
          ++missing;
        }
      }
      parkomats = [];
      for (_ in points) {
        parkomat = points[_];
        minLat = Math.min(minLat, parkomat.lat);
        maxLat = Math.max(maxLat, parkomat.lat);
        minLng = Math.min(minLng, parkomat.lng);
        maxLng = Math.max(maxLng, parkomat.lng);
        parkomat.weight = parkomat.used / parkomat.sampling;
        parkomats.push(parkomat);
      }
      parkomats.sort(function(a, b) {
        return a.weight - b.weight;
      });
      return fn();
    });
  };

  render = function(fn) {
    var ctx, i, im, max, min, obj, parkomat, res, sorted, stat, stats, val, x, y, _i, _j, _k, _l, _len, _len1, _len2, _m, _n, _ref, _ref1, _ref2;
    res = 70;
    stats = [];
    ctx = canvas.getContext("2d");
    ctx.width = ctx.height = canvas.width = canvas.height = res;
    for (_i = 0, _len = parkomats.length; _i < _len; _i++) {
      parkomat = parkomats[_i];
      x = (parkomat.lng - minLng) / (maxLng - minLng);
      y = (maxLat - parkomat.lat) / (maxLat - minLat);
      x = x * res >>> 0;
      y = y * res >>> 0;
      obj = stats[x + y * res] || {
        weight: 0,
        used: 0
      };
      obj.weight += parkomat.sampling;
      obj.used += parkomat.used;
      stats[x + y * res] = obj;
    }
    max = 0;
    min = 1000000;
    for (_j = 0, _len1 = stats.length; _j < _len1; _j++) {
      stat = stats[_j];
      if (stat && stat.weight) {
        stat.val = stat.used / stat.weight;
        max = Math.max(max, stat.val);
        min = Math.min(min, stat.val);
      }
    }
    for (_k = 0, _len2 = stats.length; _k < _len2; _k++) {
      stat = stats[_k];
      if (stat) {
        stat.val = (stat.val - min) / (max - min);
      }
    }
    sorted = stats.filter(function(a) {
      return a;
    });
    sorted.sort(function(a, b) {
      return (a.val - b.val) || (b.weight - a.weight);
    });
    for (i = _l = 0, _ref = sorted.length - 1; 0 <= _ref ? _l <= _ref : _l >= _ref; i = 0 <= _ref ? ++_l : --_l) {
      if (sorted[i].val !== 0) {
        sorted[i].val = i / sorted.length * 256;
      }
    }
    im = ctx.getImageData(0, 0, res, res);
    for (y = _m = 0, _ref1 = res - 1; 0 <= _ref1 ? _m <= _ref1 : _m >= _ref1; y = 0 <= _ref1 ? ++_m : --_m) {
      for (x = _n = 0, _ref2 = res - 1; 0 <= _ref2 ? _n <= _ref2 : _n >= _ref2; x = 0 <= _ref2 ? ++_n : --_n) {
        val = 0;
        stat = stats[x + y * res];
        if (stat) {
          val = stat.val;
          im.data[4 * (x + y * res) + 0] = val;
          im.data[4 * (x + y * res) + 1] = 255 - val;
          im.data[4 * (x + y * res) + 2] = 0;
          im.data[4 * (x + y * res) + 3] = 150;
        }
      }
    }
    ctx.putImageData(im, 0, 0);
    return fn();
  };

  run(function() {
    return updatePoints(function() {
      return render(function() {
        L.imageOverlay(canvas.toDataURL(), [[minLat, minLng], [maxLat, maxLng]]).addTo(map);
        desc.style.opacity = 0;
        return desc.style.zIndex = 0;
      });
    });
  });

  $(run);

  document.ondeviceready = run;

}).call(this);
