"use strict";

const http = require("http");

// Download a page and call callback(body)
const get_page = function(options, callback) {
  http.request(options, function(res) {
    // Somewhat handle redirects (not really, but good enough):
    if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
      if (!options.headers){
        options.headers = {};
      }
      options.headers['cookie'] = res.headers["set-cookie"];
      options.path = res.headers.location;
      return get_page(options, callback);
    }

    res.setEncoding('utf8');
    let ret = "";
    res.on('data', (chunk) => ret += chunk);
    res.on('end', () => callback(ret));
  }).end();
};

// Download a user's inventory and call callback(inventory)
const get_user_inventory = function(id, start, callback) {
  const options = {
    host: 'steamcommunity.com',
    port: 80,
    path: `/id/${id}/inventory/json/753/6?start=${start}`,
    method: 'GET'
  };
  get_page(options, ret => callback(JSON.parse(ret)));
};

// Download the inventory page from http://steam.cards
const get_inventory_page = function(callback) {
  const options = {
    host: 'www.steamcardexchange.net',
    port: 80,
    path: '/index.php?inventory',
    method: 'GET'
  };
  get_page(options, callback);
};

const is_card = function(item) {
  const type = item['type'];
  return type.substring(type.length - 4, type.length) === "Card";
};

const parse_inventory_page_sets = function(data) {
  // Parse the game prices:
  let gameprices = data.substr(data.indexOf("var gameprices=")+15);
  gameprices = gameprices.substr(0, gameprices.indexOf(';'));
  gameprices = JSON.parse(gameprices);

  let stocklist = data.substr(data.indexOf("var stocklist=") + 14);
  stocklist = stocklist.substr(0, stocklist.indexOf(';'));
  stocklist = JSON.parse(stocklist);

  // Get a list of all games and the number of cards in each set:
  let sets = {};
  const regexp = new RegExp(/\<a href=\"index\.php\?inventorygame-appid-(\d+)\"\>([^\<]*)\<\/a\>\<\/td\>\<td id=\"price-(\d+)/g);
  let match;
  while (match = regexp.exec(data)) {
    // Convert game_id to an integer
    const game_id = ~~match[1];
    const nr_cards = stocklist[match[3]] || [undefined];
    sets[game_id] = {
      'game_name': match[2],
      'card_price': ~~(gameprices[match[3]]),
      'nr_cards': ~~(nr_cards[0])
    };
  }
  return sets;
}

// Start server
http.createServer(function(request, response) {
  if (request.url === "/favicon.ico") return;
  response.writeHeader(200, {"Content-Type": "text/plain"});
  let result = { };
  const search = request.url.substr(1).split(',')
  // 17710_2,317710_3,284770_6,212680_5,321260_9,72000_6
  for (const card in search) {
    //response.write("Looking for: " + search[card] + "\n");
    result[search[card]] = { 'count': 0, 'game': 'unknown', 'card': 'unknown' }
  }

  //CardExchange
  const search_inventory = function(start) {
    get_user_inventory('CardExchange', start, function(res) {
      let amount = {};
      const rgInventory = res['rgInventory'];
      for (const key in rgInventory) {
        const item_id = rgInventory[key]["classid"];
        if (amount[item_id] === undefined) {
          amount[item_id] = 0;
        }
        amount[item_id] += 1;
      }

      const descriptions = res['rgDescriptions'];
      for (const key in descriptions) {
        const app_data = descriptions[key]['app_data'];
        const card = `${app_data['appid']}_${app_data['item_type']}`;
        if (card in result) {
          //response.write("Found card: " + card + "\n");
          result[card]['count'] = amount[descriptions[key]['classid']];
          result[card]['game'] = descriptions[key]['type'];
          result[card]['card'] = descriptions[key]['market_name'];
        } else {
          //response.write(card + "\n");
        }
      }
      if (res['more']) {
        //response.write("Going to next page: " + res['more_start'] + "...\n");
        setTimeout( () => search_inventory(res['more_start']), 0);
      } else {
        for (const card in result) {
          const c = result[card];
          const link =
            c['count'] > 1 ?
            `http://www.steamcardexchange.net/index.php?inventorygame-appid-${card}` :
            "";
          response.write(`${c['count']} : ${c['game']} : ${c['card']} : ${link} : ${card}\n`);
        }
        response.end();
      }
    });
  }
  search_inventory(0);
}).listen(8080);

console.log("Server Running on http://localhost:8080");

// Start server
http.createServer(function(request, response) {
  if (request.url === "/favicon.ico") return;
  response.writeHeader(200, {"Content-Type": "text/plain"});
  const user_id = request.url.substr(1);
  if (user_id === "") {
    response.write("No user_id");
    response.end();
    return;
  }

  const parse_inventory_page = function(data) {
    // Get the current queue for the bot:
    let current_cueue = data.substr(data.indexOf("There are currently"));
    current_cueue = current_cueue.substr(0, current_cueue.indexOf('<'));
    response.write(`${current_cueue}\n\n`);

    // Parse all the card sets from the page:
    const sets = parse_inventory_page_sets(data);
    // Compare that to our inventory:
    get_user_inventory(user_id, 0, function(data) {
      let inventory = [];
      const descriptions = data['rgDescriptions'];
      let last_game_id;
      for (const key in descriptions) {
        if (!is_card(descriptions[key])) {
          continue;
        }
        const game_id = ~~(descriptions[key]['app_data']['appid']);
        let game;
        if ((game = sets[game_id]) !== undefined) {
          if (last_game_id === undefined || last_game_id !== game_id) {
            inventory.push({
              'game_id': game_id,
              'game_name': game['game_name'],
              'total_price' : game['card_price'] * game['nr_cards']
            });
            last_game_id = game_id;
          }
        } else {
           // response.write("Could not find game: " + game_id + "\n");
        }
      }

      // Sort the list by total price:
      inventory.sort( (a, b) => b['total_price'] - a['total_price']);

      // Print the result:
      for (const card in inventory) {
        response.write(`${inventory[card]['game_name']} : ${inventory[card]['total_price']}\n`);
      }

      response.end();
    });
  };
  get_inventory_page(parse_inventory_page);
}).listen(8081);

console.log("Server Running on http://localhost:8081");

