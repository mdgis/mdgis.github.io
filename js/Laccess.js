/* Accessibility map2 Visualization */
//TODO add the Legend
accessVizGlobals = {};

AccessVis = function(_parentElement, _classLabel){
    this.parentElement = _parentElement;
    this.width = 800;
    this.height = 900;
    this.columns = [];
    this.rateByTAZ = d3.map();
    this.max = 0;
    this.classify = [];
    this.mode = "";
    this.classLabel = _classLabel;
    this.projection = d3.geo.mercator()
        .center([-71.1603, 42.305])
        .rotate([0, 0, 0])
        .scale(30000)
        .translate([this.width / 2, this.height / 2]);
    this.initVis();
};

AccessVis.prototype.projectPoint =function(x, y) {
    var point = map2.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
};

AccessVis.prototype.initVis = function() {
    var that = this;
    //D3 Overlay Stuff
    accessVizGlobals.svg = d3.select(map2.getPanes().overlayPane).append("svg");
    accessVizGlobals.g = accessVizGlobals.svg.append("g").attr("class", "leaflet-zoom-hide");
    this.transform = d3.geo.transform({point: that.projectPoint});
    accessVizGlobals.path = d3.geo.path().projection(this.transform);

    var Alegend = L.control( { position: 'bottomright' } );
    Alegend.onAdd = function (map) {
        console.log("in the legend")
        var div = L.DomUtil.create('div', 'accessLegend');

        return div
    };
    Alegend.addTo(map2)

    this.wrangleData(access, 0);
    this.updateVis();


};

AccessVis.prototype.showValue = function(val){
    this.wrangleData(access, val);
};

AccessVis.prototype.manualColor = function(val){
        var that = this;
        var out =
            val < that.classify[0] ? 0 :
                val < that.classify[1] ? 1 :
                    val < that.classify[2] ? 2 :
                        val < that.classify[3] ? 3 :
                            val < that.classify[4] ? 4 :
                                val < that.classify[5] ? 5 :
                                    val < that.classify[6] ? 6 :
                                        val < that.classify[7] ? 7 :
                                            val < that.classify[8] ? 8 : 0;
        return that.mode + out + "-9"


};

AccessVis.prototype.updateVis = function(){
    var that = this;


    var check = Object.keys(access[0])[1];
    //Is it transit, auto, or walk
    var q =  check.indexOf("Dta") >= 0 ? "a" : check.indexOf("transit") >= 0 ? "t" : "w";
    var tpath = accessVizGlobals.g.selectAll("path")
        .data(topojson.feature(data, data.objects.taz).features);


    tpath.enter().append("path").style("opacity", 0.7);
    tpath.attr("class", function(d) {
        var val = that.rateByTAZ.get(d.properties.TAZ);
        if (val < .00001 ) {return "white"}
        else {return that.manualColor(val)}});

    map2.on("viewreset", reset);
    reset(that);

    // Reposition the SVG to cover the features.
    function reset(theViz) {
        var that = theViz;
        var bounds = accessVizGlobals.path.bounds(topojson.feature(data, data.objects.taz)),
            topLeft = bounds[0],
            bottomRight = bounds[1];
        accessVizGlobals.svg.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");
        accessVizGlobals.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
        tpath.attr("d", accessVizGlobals.path);
        }

    that.addLegend();
};

AccessVis.prototype.wrangleData = function(access, level){
    var that = this;
    //Control For First Case Situations
    var first = current === null;
    if(!current){ current = accessUnits.auto }

    that.mode = access === accessUnits[accessUnits.method+"auto"] ? "a" :
        access === accessUnits[accessUnits.method+"transit"] ? "t" : "w";

    if (Object.keys(current[0])[1] !== Object.keys(access[0])[1]){
        that.max = 0;
        that.current = access
    }
    that.columns = Object.keys(access[0]);
    that.columns.splice(that.columns.indexOf("Z"),1);

    level = that.columns[level];
    access.forEach(function(d) {
        if (d[level] > that.max) that.max = +d[level];
        that.rateByTAZ.set(Math.floor(d.Z), + d[level]); });


    if (current !== access || first){
        current = access;
        that.classify = chloroQuantile(that.rateByTAZ.values(), 8, "jenks");}
    that.updateVis()
};



AccessVis.prototype.addLegend = function() {
    that = this;
    console.log("in the Access legend")
    d3.selectAll(".accessLegendRect").remove();
    d3.selectAll(".accessLegendSVG").remove();
    console.log("Acces Classify", that.classify)
    var legendData = that.classify.slice(0);
    console.log("LegendData", legendData)
    var legendHeight = 200;
    var legend = d3.select(".accessLegend")
        .append("svg")
        .attr("class","accessLegendSVG")
        .attr("width",100)
        .attr("height",legendHeight)
        .append("g")
        .attr("transform", "translate(0,0)")
        .selectAll("g.accessLegend")
        .data(legendData.reverse())
        .enter()
        .append("g")
        .attr("class", "accessLegend");

    var ls_w = 30, ls_h = 20;

    legend.append("rect")
        .attr("class","accessLegendRect")
        .attr("x", 10)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - 2*ls_h;})
        .attr("width", ls_w)
        .attr("height", ls_h)
        .attr("class", function(d, i) {
            return that.manualColor(d-0.0001)
        })
        .style("opacity", 0.7);

    legend.append("text")
        .attr("x", 50)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - ls_h - 4;})
        .text(function(d, i){ return legendData[i].toFixed(3) });

};

AccessVis.prototype.toggleLegend = function(bool){
    //asset_map_viz.toggleLegend(true)
    //d3.select(".accessLegend").classed("hide",bool)
};



