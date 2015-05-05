//Todo add legend


netVizGlobals = {"attribute":"V", "vScale":null, "colorScale": undefined , "legendDomain":undefined};
NetViz = function(_map, _data){
    this.map = _map;
    this.collection = _data;
    $("#netV").addClass("selectedButton");

    //Initialize Legend
    var Nlegend = L.control( { position: 'bottomright' } );
    Nlegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'netLegend');
        return div
    };


    Nlegend.addTo(map5);
    this.initVis();
    this.updateVis(this.collection, "V")

    //CODE to Classify the Networks - The networks are so big that reclassifying on the fly
    //is very slow like 20 seconds each time, therefore I have added a hard classification.
    //But code below is what one would run to update the classification.

    //var TrueMax = d3.max(nets.n0.objects['dta'].geometries, function(d) {
    //    return d.properties["V"]});
    //var volVals = nets.n0.objects['dta'].geometries.map(function(d) {
    //    return d.properties["V"]});
    //
    //var volClassify = chloroQuantile(volVals, 7, "jenks" );
    //
    //var qVals = nets.n0.objects['dta'].geometries.map(function(d) {
    //    var val = Math.round(d.properties["q"]);
    //    if (val <= 5000 &&  val !== undefined) {return Math.round(d.properties["q"]);}
    //    else {return 0}
    //});
    //
    //var qClassify = chloroQuantile(qVals, 7, "jenks" );


};

NetViz.prototype.initVis = function() {
    netVizGlobals.qClassify = [0, 32, 110, 250, 503, 918, 1617, 2500];
    netVizGlobals.volClassify = [101, 263, 497, 821, 1295, 2153, 3860, 7895];
    var that = this;
    that.svg = d3.select(that.map.getPanes().overlayPane).append("svg");
    that.g = that.svg.append("g").attr("class", "leaflet-zoom-hide");
    that.gTopoMap = that.g.append("g").attr("class", "gTopoMap displayed");
};

NetViz.prototype.updateVis = function(collection, netAttribute) {
    d3.selectAll(".netLegendRect").remove();
    d3.selectAll(".netLegendSVG").remove();
    var that = this;
    var transform = d3.geo.transform({point: projectPoint}),
        path = d3.geo.path().projection(transform);

    var scaleMax = netAttribute === "q" ? 50 : 50;


    if (netAttribute === "q" && vMax > 30000){
        vMax = 5000
    }

    var vMax = netAttribute === "V" ? netVizGlobals.volClassify[7] : netVizGlobals.qClassify[7];
    console.log(vMax, "BJHBJHBJ")

    var displayDomain = netAttribute === "V" ? netVizGlobals.volClassify : netVizGlobals.qClassify;
    netVizGlobals.legendDomain = displayDomain.slice(0,8);

    var vScale = d3.scale.linear()
    .domain(displayDomain)
    .range([1,2,4,8,12,14,18,25]);

    var colorDomain = ["black","#333333","purple","darkblue","blue","red", "orange", "yellow"];
    netVizGlobals.colorScale = d3.scale.linear()
        .domain(displayDomain)
        .range(colorDomain);


    var feature = that.gTopoMap.selectAll("path")
        .data(topojson.feature(collection, collection.objects['dta']).features);

    feature
        .enter().append("path");

    feature.attr("class","RoadPath").style("stroke-width", function(d){
             return vScale(d.properties[netAttribute])}
        )
        .attr("stroke", function(d){
            return netVizGlobals.colorScale(d.properties[netAttribute] )
        });

    feature.exit().remove();
    that.addLegend();
    that.map.on("viewreset", reset);
    reset();
    // Reposition the SVG to cover the features.
    function reset() {

        var bounds = path.bounds(topojson.feature(collection, collection.objects['dta'])),
            topLeft = bounds[0],
            bottomRight = bounds[1];

        that.svg.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        that.gTopoMap.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        feature.attr("d", path);
    }

    function projectPoint(x, y) {
        var point = that.map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }


};




NetViz.prototype.addLegend = function() {
    console.log("adding net legend");
    var that = this;

    var legendData = netVizGlobals.legendDomain;
    var legendHeight = 200;
    var legend = d3.select(".netLegend")
        .append("svg")
        .attr("class","netLegendSVG")
        .attr("width",100)
        .attr("height",legendHeight)
        .append("g")
        .attr("transform", "translate(0,0)")
        .selectAll("g.netLegend")
        .data(legendData.reverse())
        .enter()
        .append("g")
        .attr("class", "netLegend");

    var ls_w = 30, ls_h = 20;

    legend.append("rect")
        .attr("class","netLegendRect")
        .attr("x", 10)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - 2*ls_h;})
        .attr("width", ls_w)
        .attr("height", ls_h)
        .attr("fill", function(d, i) {
            return netVizGlobals.colorScale(d)
        })
        .style("opacity", 0.6);

    legend.append("text")
        .attr("x", 50)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - ls_h - 4;})
        .text(function(d, i){ return  legendData[i].toFixed()});

    legend.append("text")
        .attr("x", 13)
        .attr("y", 13)
        .attr('text-anchor', 'start')
        .text("Vehicles");

    that.updateAssetInfo()
};


NetViz.prototype.updateAssetInfo = function(){
    var that = this;
    $(".netInfo").remove();
    info.onAdd = function (map3) {
        this._div = L.DomUtil.create('div', 'netInfo');
        this.update();
        return this._div;
    };

    //Control FLow for Labels - sort of a mess but running out of time.
    var label = netVizGlobals.attribute;
    if (label === "V"){
        label = "Volumes"
    } else {
        label = "Queues"
    }


    info.update = function (asset) {
        this._div.innerHTML = '<h4>' + label + '</h4>'
    };
    info.addTo(map5);


};