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
    that = this;
    //D3 Overlay Stuff
    accessVizGlobals.svg = d3.select(map2.getPanes().overlayPane).append("svg");
    accessVizGlobals.g = accessVizGlobals.svg.append("g").attr("class", "leaflet-zoom-hide");
    this.transform = d3.geo.transform({point: that.projectPoint});
    accessVizGlobals.path = d3.geo.path().projection(this.transform);
    this.wrangleData(access, 0);
    this.updateVis()
};

AccessVis.prototype.showValue = function(val){
    this.wrangleData(access, val);
};

AccessVis.prototype.updateVis = function(){
    that = this;
    function manualColor(val) {
        out =
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
    }

    var check = Object.keys(access[0])[1];
    //Is it transit, auto, or walk
    var q =  check.indexOf("Dta") >= 0 ? "a" : check.indexOf("transit") >= 0 ? "t" : "w";
    var tpath = accessVizGlobals.g.selectAll("path")
        .data(topojson.feature(data, data.objects.taz).features)


    tpath.enter().append("path").style("opacity", 0.7);
    tpath.attr("class", function(d) {
        var val = that.rateByTAZ.get(d.properties.TAZ);
        if (val < .00001 ) {return "white"}
        else {return manualColor(val)}});

    map2.on("viewreset", reset);
    reset(that);

    // Reposition the SVG to cover the features.
    function reset(theViz) {
        that = theViz;
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
};

AccessVis.prototype.wrangleData = function(access, level){
    that = this;
    //Control For First Case Situations
    var first = current === null;
    if(!current){ current = accessUnits.auto }

    that.mode = access === accessUnits[accessUnits.method+"auto"] ? "a" : access === accessUnits[accessUnits.method+"transit"] ? "t" : "w";

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

    test = that.rateByTAZ
    if (current !== access || first){
        current = access;
        that.classify = chloroQuantile(that.rateByTAZ.values(), 8, "jenks");}
    that.updateVis()
};




