$(document).ready(function() {
  var table = document.getElementById("inventorylist");
  var r1 = table.rows[0];
  var th = r1.cells[2].cloneNode(true);
  th.innerText = "Total";
  r1.appendChild(th);


  function run() {
    $.each(gameprices, function(appid, price) {
      var row = $('#price-'+appid).parent()[0];
      if (row !== undefined) {
        var col = row.insertCell(-1);
        if (appid in stocklist) {
          var count = stocklist[appid][0];
          col.innerText = price * count;
        }
      }
    });
  };
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('('+ run +')();'));
  (document.body || document.head || document.documentElement).appendChild(script);
});
