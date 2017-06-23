"use strict";

// On the main inventory page, create a new column with the total price
// of each badge.
document.addEventListener("DOMContentLoaded", function() {
  function run() {
    // Override all calls to jquery by taking over $:
    const jquery = $;
    $ = (function(arg) {
      var ret = jquery(arg);
      // This way, we can intercept the creation of the datatable, and add a
      // new column with the data we need:
      if (arg === '#inventorylist') {
        const jquery_DataTable = jquery(arg).__proto__.DataTable;
        ret.__proto__.DataTable = function(args) {
          args.columns[0].width = '50%';
          args.columns.push({width: '10%', title: 'Total price'});
          args.columnDefs.push({
            targets: [4],
            render: function(data, type, full, meta) {
              return full[1]*full[3][0];
            }
          });
          args.createdRow = function(row, data) {
            row.id = "appid-" + data[0][0];
          };
          // Make sure we use the correct "this" here:
          return jquery_DataTable.call(ret, args);
        }
        // After this, we need to return $ to jquery, to make sure that the
        // filters are still working.
        $ = jquery;
      }
      return ret;
    }).bind(jquery);
  };
  // We need to execute this script in the same context as the page (not the
  // extension's context):
  const script = document.createElement("script");
  script.appendChild(document.createTextNode("("+ run +")();"));
  (document.body || document.head || document.documentElement).appendChild(script);
});


$(document).ready(function() {
  const user_name = $(".name")[0].innerText.split(' (')[0];
  if (user_name === "") return; // If the user is not logged in
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
            if ((obj["market_fee_app"] === appid) &&
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
    // TODO: The inventory page is paginated, capped at a size of ~2500.
    xhr.open("GET", "https://steamcommunity.com/id/" + user_name + "/inventory/json/753/6?start=0", true);
    xhr.send();
  } else {
    // TODO: Temporary workaround
    setTimeout(function() {
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
            const row = document.getElementById("appid-" + appid);
            if (row === null) return true;
            const a = row.firstElementChild.firstElementChild;
            const span = document.createElement("span");
            span.style.fontSize = "0.9em";
            span.style.color = "#999";
            span.innerText = " (" + info;
            if ((progress === "Ready") ||
                (progress.substr(0,1) !== "0") ||
                (info !== "No card drops remaining")) {
              span.innerText += ", " + progress;
              if (progress === "Ready") {
                row.style.cssText = "background-color: #470 !important";
              } else if (progress.substr(0,1) !== "0") {
                row.style.cssText = "background-color: #047 !important";
              }
            }
            span.innerText += ")";
            a.appendChild(span);
            row.classList.add("owned");
          }
        });
        // Find Level 5 badges, and remove them from the page inventory page:
        // TODO:
        /*
        $.each(responseDocument.find('*:contains("Level 5,")'), function(index, a) {
          if (a.className === "badge_row is_link") {
            const appid = a.firstElementChild.href.split("/").slice(6,7)[0];
            document.getElementById("appid-" + appid).remove();
          }
        });*/
      }
    };
    xhr.open("GET", "https://steamcommunity.com/id/" + user_name + "/badges/", true);
    xhr.send();
    }, 5000);

    // Add a filter button for only displaying sets with cards you own:
    const link = document.createElement("div");
    link.onclick = function() { $("#inventorylist").toggleClass("filter"); };
    link.innerText = "OWNED";
    link.className = "button-blue";
    document.getElementById("inventory-info").children[0].appendChild(link);
  }
});
