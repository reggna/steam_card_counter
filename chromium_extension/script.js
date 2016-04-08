"use strict";

$(document).ready(function() {
  if (location.href.indexOf("inventorygame-appid") > -1) {
    // Fetch the users inventory, parse it and print out the number of each
    // card that the user has.
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {
        const json = JSON.parse(xhr.responseText);
        // Create an object that maps classid to the number of each card that
        // is in the user's inventory
        const amount = { };
        const rgInventory = json['rgInventory'];
        for (const key in rgInventory) {
          const item_id = rgInventory[key]["classid"];
          if (amount[item_id] === undefined) {
            amount[item_id] = 0;
          }
          amount[item_id] += 1;
        }
        // Loop over each card on the page
        $.each($(".inventory-game-card-item"), function(i, el) {
          // Break the loop if this is not a real card
          if (el.firstChild.firstChild === null) return false;
          const name = $(".card-name", el)[0].innerText;
          const tname = name + " (Trading Card)";
          const appid = location.search.match(/inventorygame-appid-([0-9]+)/)[1];
          $.each(json["rgDescriptions"], function(id, obj) {
            if ((obj["app_data"]["appid"] === appid) &&
                (obj["name"] === name || obj["name"] === tname)) {
              // Skip this item if it's not a card, or if it's a foil card:
              const type = obj['type'];
              const is_foil = obj['market_name'].indexOf('(Foil)') > -1;
              if (type.substring(type.length - 4, type.length) === "Card" && !is_foil) {
                const div = document.createElement('div');
                div.innerText = "You got " + amount[obj["classid"]];
                el.firstChild.appendChild(div);
                // Found the card we're searching for, so stop the loop now:
                return false;
              }
            }
          });
        });
      }
    };
    const user_name = $(".name")[0].innerText;
    if (user_name === "") return; // If the user is not logged in
    // TODO: The inventory page is paginated, capped at a size of ~2500.
    xhr.open("GET", "https://steamcommunity.com/id/" + user_name + "/inventory/json/753/6?start=0", true);
    xhr.send();
  } else {
    // On the main inventory page, create a new column with the total price
    // of each badge.
    const table = document.getElementById("inventorylist");
    const r1 = table.rows[0];
    const th = r1.cells[2].cloneNode(true);
    th.innerText = "Total";
    r1.appendChild(th);

    // Execute this script in the page js context, as it has all the
    // necessary data:
    function run() {
      $.each(gameprices, function(appid, price) {
        const row = $('#price-'+appid).parent()[0];
        if (row !== undefined) {
          const col = row.insertCell(-1);
          if (appid in stocklist) {
            const count = stocklist[appid][0];
            col.innerText = price * count;
          }
        }
      });
    };
    const script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ run +')();'));
    (document.body || document.head || document.documentElement).appendChild(script);
  }
});
