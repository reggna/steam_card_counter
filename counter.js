var sys = require("sys");
var http = require("http");

// Download a page and call callback(body)
var get_page = function(options, callback) {
  http.request(options, function(res) {
    //console.log('STATUS: ' + res.statusCode);
    //console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    var ret = "";
    res.on('data', function (chunk) {
      ret += chunk;
    });
    res.on('end', function() {
      callback(ret);
    });
  }).end();
}

// Download a user's inventory and call callback(inventory)
var get_user_inventory = function(id, start, callback) {
  var options = {
    host: 'steamcommunity.com',
    port: 80,
    path: '/id/' + id + '/inventory/json/753/6?start=' + start,
    method: 'GET'
  };
  get_page(options, function(ret) {
    callback(JSON.parse(ret));
  });
};

// Start server
http.createServer(function(request, response){
  response.writeHeader(200, {"Content-Type": "text/plain"});
  var result = { };
  var search = request.url.substr(1).split(',')
  // 17710_2,317710_3,284770_6,212680_5,321260_9,72000_6
  for (var card in search) {
    //response.write("Looking for: " + search[card] + "\n");
    result[search[card]] = { 'count': 0, 'game': 'unknown', 'card': 'unknown' }
  }

  //CardExchange
  var search_inventory = function(start) {
    get_user_inventory('CardExchange', start, function(res) {
      var descriptions = res['rgDescriptions'];
      for (key in descriptions) {
        var app_data = descriptions[key]['app_data'];
        var card = app_data['appid'] + '_' + app_data['item_type'];
        if (card in result) {
          //response.write("Found card: " + card + "\n");
          result[card]['count'] += 1;
          result[card]['game'] = descriptions[key]['type'];
          result[card]['card'] = descriptions[key]['market_name'];
        } else {
          //response.write(card + "\n");
        }
      }
      if (res['more']) {
        response.write(res['more_start'] + "...\n");
        setTimeout(function() {
          search_inventory(res['more_start'])
        }, 0);
      } else {
        for (var card in result) {
          var link =
            result[card]['count'] > 1 ?
            "http://www.steamcardexchange.net/index.php?inventorygame-appid-" + card :
            "";
          response.write(result[card]['count'].toString() + " : " +
                         result[card]['game'] + " : " +
                         result[card]['card'] + " : " +
                         link + "\n");
        }
        response.end();
      }
    });
  }
  search_inventory(0);
}).listen(8080);

sys.puts("Server Running on http://localhost:8080");

