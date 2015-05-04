/* Accessibility map2 Visualization */
accessVizGlobals = {"current":null, "accessBrush":null};

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
    $("#AccessA").addClass("selectedButton");
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
        var div = L.DomUtil.create('div', 'accessLegend');

        return div
    };
    Alegend.addTo(map2);

    $('.leaflet-container').css('cursor','default');
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

    function mouseOver(){
        var s = d3.select(this);
        s.style("stroke","yellow")
            .style("stroke-width", 1)
        accessTip.transition()
            .duration(200)
            .style("opacity", .9);
        accessTip.html(that.rateByTAZ.get(s.node().__data__.properties.TAZ))
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    }

    function mouseOut(){
        accessTip.transition()
            .duration(500)
            .style("opacity", 0);

        var s = d3.select(this);
        if (map2.getZoom() > 11){
            s.style("stroke", "white")
                .style("stroke-width", 0.5)
        } else {
            s
                .style("stroke-width", 0)
        }
    }

    var check = Object.keys(access[0])[1];
    //Is it transit, auto, or walk
    var q =  check.indexOf("Dta") >= 0 ? "a" : check.indexOf("transit") >= 0 ? "t" : "w";
    var tpath = accessVizGlobals.g.selectAll("path")
        .data(topojson.feature(data, data.objects.taz).features);

    var accessTip = d3.select("body").append("div")
        .attr("class", "accessTip")
        .style("opacity", 0);

    tpath.enter()
        .append("path")
        .on("mouseover", mouseOver)
        .on("mouseout", mouseOut)
        .style("opacity", 0.7)
    tpath.attr("class", function(d) {
        var val = that.rateByTAZ.get(d.properties.TAZ);
        if (val < .00001 ) {return "white"}
        else {return that.manualColor(val) + " Z "}});

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

        if (map2.getZoom() > 11){
            tpath.style("stroke", "white")
                .style("stroke-width", 0.5)
        } else {
            tpath
                .style("stroke-width", 0)
        }

        }

    that.addLegend();
};

AccessVis.prototype.wrangleData = function(access, level){
    var that = this;
    d3.select("#theAccessHist").remove();
    //Control For First Case Situations
    var first = accessVizGlobals.current === null;
    if(!accessVizGlobals.current){ accessVizGlobals.current = accessUnits.auto }

    that.mode = access === accessUnits[accessUnits.method+"auto"] ? "a" :
        access === accessUnits[accessUnits.method+"transit"] ? "t" : "w";

    if (Object.keys(accessVizGlobals.current[0])[1] !== Object.keys(access[0])[1]){
        that.max = 0;
        accessVizGlobals.currentt = access
    }
    that.columns = Object.keys(access[0]);
    that.columns.splice(that.columns.indexOf("Z"),1);

    level = that.columns[level];
    access.forEach(function(d) {
        if (d[level] > that.max) that.max = +d[level];
        that.rateByTAZ.set(Math.floor(d.Z), +d[level]); });


    if (accessVizGlobals.current !== access || first){
        accessVizGlobals.current = access;
        that.classify = chloroQuantile(that.rateByTAZ.values(), 8, "jenks");}
    that.updateVis()
    that.accessHist(that.mode);
};

AccessVis.prototype.addLegend = function() {
    var that = this;
    d3.selectAll(".accessLegendRect").remove();
    d3.selectAll(".accessLegendSVG").remove();
    var legendData = that.classify.slice(0);
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

AccessVis.prototype.accessHist = function(mode){
    var that = this;
    var values = [];
    that.rateByTAZ.forEach(function(d) {
        values.push(that.rateByTAZ.get(d))
    });

    var modeColor = mode === "a" ? "rgb(33,113,181)" : mode === "t" ? "#933838" : "#383838";
    // A formatter for counts.
    var formatCount = d3.format(",.0f");

    var margin = {top: 10, right: 30, bottom: 30, left: 50},
        width = 600 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([d3.min(values), d3.max(values)])
        .range([0, width]);

    // Generate a histogram using 100(data is heavily skewed) uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(50))
    (values);

    var y = d3.scale.pow().exponent(.5)
        .domain([0, 10 + d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var svg = d3.select("#accessHist").append("svg").attr("id", "theAccessHist")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", function(d){return (width/50)-4})
        .attr("height", function(d) { return height - y(d.y); })
        .attr("class", function(d){
            return that.manualColor(d[0]);
        });

    accessVizGlobals.accessBrush = d3.svg.brush;

        svg.append("g")
        .attr("class", "brush access")
        .call(accessVizGlobals.accessBrush().x(x)
            .on("brush", brushed))
        .selectAll("rect")
        .attr("height", height);

    function brushed() {
        var s = d3.event.target.extent();
        that.brushMap(s)
    }

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("x", 25)
        .attr("y", 18)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Value");


    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency");


};

AccessVis.prototype.brushMap = function(extent){
    var that = this;
    var selectedPaths = d3.selectAll(".Z");
    if (extent[0]===extent[1]) {
        selectedPaths.classed("hide", false)
    } else {
        selectedPaths.classed("hide", function(d) {
            var check = that.rateByTAZ.get(d.properties.TAZ);
            if (check < extent[0] || check > extent[1]){
                return true
            } else {
                return false
            }

        })
    }
};