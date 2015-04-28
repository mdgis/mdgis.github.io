/* Accessibility Map Visualization */
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

    this.wrangleData(access,0);
    this.initVis();
};


AccessVis.prototype.initVis = function() {
    that = this;

// find the top left and bottom right of current projection
    this.path = d3.geo.path()
        .projection(this.projection);

    this.zoom = d3.behavior.zoom()
        .translate(that.projection.translate())
        .scale(that.projection.scale())
        .scaleExtent([that.height * 25, 500 * that.height])
        .on("zoom", that.zoomed);

    this.svg = this.parentElement.append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("class", this.classLabel);

    this.g = this.svg.append("g")
        .call(this.zoom);

};


AccessVis.prototype.zoomed = function() {
    that = access_viz;
    that.projection.translate(d3.event.translate).scale(d3.event.scale);
    that.g.selectAll("path").attr("d", that.path);
};

AccessVis.prototype.showValue = function(val){
    document.getElementById("range").innerHTML= val + "ft";
    this.wrangleData(access, val);
};


AccessVis.prototype.updateVis = function(){
    that = this;

    console.log("IN accessVis UpdateVis")
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
    var quantize = d3.scale.quantile()
        .domain([0.0, max])
        .range(d3.range(9).map(function(i) { return q + i + "-9"; }));

    var tpath = this.svg.select("g")
        .attr("class", "taz")
        .selectAll("path")
        .data(topojson.feature(data, data.objects.taz).features);

    tpath.enter().append("path");
    tpath.attr("class", function(d) {
        var val = that.rateByTAZ.get(d.properties.TAZ);
        if (val < .00001 ) {return "white"}
        else
            return manualColor(val)})
        .attr("d", that.path);

    tpath.exit().remove()
};

AccessVis.prototype.wrangleData = function(access, level){
    that = this;
    //Control For First Case Situations
    this.first = current === null;
    if(!current){ current = auto };

    that.mode = access === auto ? "a" : access === transit ? "t" : "w";


    if (Object.keys(current[0])[1] !== Object.keys(access[0])[1]){
        that.max = 0;
        that.current = access
    }
    that.columns = Object.keys(access[0]);
    that.columns.splice(that.columns.indexOf("Z"),1);

    level = that.columns[level];
    access.forEach(function(d) {
        if (d[level] > that.max) that.max = +d[level];
        that.rateByTAZ.set(d.Z, + d[level]); });

    test = that.rateByTAZ
    if (current !== access || first){
        current = access;
        that.classify = chloroQuantile(that.rateByTAZ.values(), 8, "jenks");}
        that.updateVis()
};




