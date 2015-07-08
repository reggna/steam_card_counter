$(document).ready(function() {
  var table = document.getElementById("inventorylist");
  var r1 = table.rows[0];
  var th = r1.cells[2].cloneNode(true);
  th.innerText = "Total";
  r1.appendChild(th);


  function run() {
    if (typeof(gameprices) === "undefined") {
      $.each($("#inventorylist")[0].rows, function(i, row) {
        if (i === 0) return;
        var price = row.cells[1].innerHTML.split('c')[0];
        var col = row.insertCell(-1);
        var count = parseInt(row.cells[3].innerText.substring(9, 12));
        col.innerText = price * count;
      });
    } else {
      $.each(gameprices, function(appid, price) {
        var row = $('#price-'+appid).parent()[0];
        if (row !== undefined) {
          var col = row.insertCell(-1);
          var count = parseInt(row.cells[3].innerText.substring(9, 12));
          col.innerText = price * count;
        }
      });
    }
  };
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('('+ run +')();'));
  (document.body || document.head || document.documentElement).appendChild(script);
});
