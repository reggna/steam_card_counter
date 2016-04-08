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
        const rgInventory = json["rgInventory"];
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
              const type = obj["type"];
              const is_foil = obj["market_name"].indexOf("(Foil)") > -1;
              if (type.substring(type.length - 4, type.length) === "Card" && !is_foil) {
                const div = document.createElement("div");
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
        const row = $("#price-"+appid).parent()[0];
        if (row !== undefined) {
          const col = row.insertCell(-1);
          if (appid in stocklist) {
            const count = stocklist[appid][0];
            col.innerText = price * count;
          }
        }
      });
    };
    const script = document.createElement("script");
    script.appendChild(document.createTextNode("("+ run +")();"));
    (document.body || document.head || document.documentElement).appendChild(script);

    // Add a highlight of the sets with already owned cards:
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {
        const responseDocument = $($.parseHTML(xhr.responseText));
        $.each(responseDocument.find(".badge_row"), function(index, badge_row) {
          let appid = badge_row.firstElementChild.href.match("([0-9]+)/$");
          // If this is a foil or something, just continue:
          if (appid === null) return true;
          appid = appid[1];
          const info = $(badge_row).find(".progress_info_bold").text().trim();
          const progress = $(badge_row).find(".badge_progress_info").text().trim();
          if (info.length > 0) {
            const row = document.getElementById("status-" + appid);
            const a = row.firstElementChild;
            const span = document.createElement("span");
            span.style.fontSize = "0.9em";
            span.style.color = "#999";
            span.innerText = " (" + info;
            if ((progress === "Ready") ||
                (progress.substr(0,1) !== "0") ||
                (info !== "No card drops remaining")) {
              span.innerText += ", " + progress;
              if (progress === "Ready") {
                a.style.cssText = "background-color: #470 !important";
              } else if (progress.substr(0,1) !== "0") {
                a.style.cssText = "background-color: #047 !important";
              }
            }
            span.innerText += ")";
            a.appendChild(span);
          }
        });
      }
    };
    const user_name = $(".name")[0].innerText;
    if (user_name !== "") {
      xhr.open("GET", "https://steamcommunity.com/id/" + user_name + "/badges/", true);
      xhr.send();
    }
  }
});
