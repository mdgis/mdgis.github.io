/* Accessibility Map Visualization */
NetVis = function(_parentElement){
    this.parentElement = _parentElement
    this.width = 800;
    this.height = 900;
    this.columns = [];
    this.rateByTAZ = d3.map();
    this.max = 0;
    this.classify = [];
    this.mode = "";

    this.projection = d3.geo.mercator()
        .center([-71.1603, 42.305])
        .rotate([0, 0, 0])
        .scale(25000)
        .translate([this.width / 2, this.height / 2]);
    console.log("In the first part of netviz")
    this.initVis();
};


NetVis.prototype.initVis = function() {
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
        .attr("height", this.height);

    this.g = this.svg.append("g")
        .call(this.zoom);
this.updateVis()
};


NetVis.prototype.zoomed = function() {
    that = net_viz;
    console.log(that.projection);
    that.projection.translate(d3.event.translate).scale(d3.event.scale);
    that.g.selectAll("path").attr("d", that.path);
};


NetVis.prototype.updateVis = function(){
    that = this;

    console.log("in update")
   //Is it transit, auto, or walk

    var tpath = this.svg.select("g")
        .attr("class", "taz")
        .selectAll("path")
        .data(topojson.feature(dta, dta.objects.DTA_g100V).features);

    tpath.enter().append("path");
    tpath.style("stroke", "black")
        .attr("d", that.path);

    tpath.exit().remove()
};



/**
 * Created by mdowd on 4/9/15.
 */
