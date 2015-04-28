/**
 * Created by mdowd on 4/10/15.
 */
var spider_viz = null;
SpiderViz = function(_parentElement){
    this.parentElement = _parentElement;
    this.Mtaz = null;
    this.links = [];
    this.vals = [];
    this.auto = null;
    this.transit = null;
    this.taz = null;


    queue().defer(d3.json, "RawData/tazCtopo.json")
        .defer(d3.csv, "RawData/autoDiff.csv")
        .defer(d3.csv, "RawData/ptDiff.csv")
        .defer(d3.csv, "RawData/totalLost.csv")
        .await(this.ready);
};

SpiderViz.prototype.ready = function(error, taz, auto, pt, total) {
    var that = spider_viz;
    that.links = [];
    that.vals = [];
    that.taz = taz;
    that.auto = auto;
    that.transit = pt;
    that.total = total
    that.loaded(that.taz, that.auto)
};


SpiderViz.prototype.initVis = function(){
    that = this;
    that.vMax = d3.max(that.links, function(d) {return Math.abs(d.val)});
    that.vScale = d3.scale.linear()
        .domain([10,that.vMax])
        .range([1,15]);

    that.oScale = d3.scale.linear()
        .domain([10,that.vMax])
        .range([.1,.8]);

    that.color = d3.scale.linear()
        .domain([20,100,200,300,400,500,that.vMax])
        .range(["purple","black","#000329","#29022C","#530230", "orange", "yellow"]);


    that.featureLine = that.g.append("g").attr("class","spiderLines").attr("class", "leaflet-zoom-hide")
        .selectAll("path")
        .data(that.links)
        .enter().append("path").attr("class", "theSpiderLines");

    that.featureLine
        .attr("opacity",function(d) {return that.oScale(Math.abs(d.val))})
        .style("stroke-width", function(d){
            return that.vScale(Math.abs(d.val))
        })
        .attr("stroke", function(d){return that.color(Math.abs(d.val))});


    that.featureCentroid = that.g.attr("class","centroids").attr("class", "leaflet-zoom-hide").selectAll("circle")
        .data(topojson.feature(that.Mtaz, that.Mtaz.objects.tazCenter).features)
        .enter()
        .append("circle")
        .attr("r", 2)
        .on("click", function(d){
            var check = d3.selectAll(".theSpiderLines");
            check.classed("hide", function(f) {
                    if (f.O == d.properties.TAZ || f.D == d.properties.TAZ) {
                        return false
                    } else {
                        return true}
                }
            )
        })
        .attr("class", "centroids");

    that.featureCentroid
        .attr("id", function(d) {return d.id;});


    that.parentElement.on("viewreset", reset);
    reset();
    // Reposition the SVG to cover the features.
    function reset() {
        var that = spider_viz;
        var bounds = that.path.bounds(topojson.feature(that.Mtaz, that.Mtaz.objects.tazCenter)),
            topLeft = bounds[0],
            bottomRight = bounds[1];

        that.svg.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        that.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        that.
            featureCentroid.attr("transform",
            function(d) {
                return "translate("+
                    map4.latLngToLayerPoint(d.properties.LatLng).x +","+
                    map4.latLngToLayerPoint(d.properties.LatLng).y +")";}
        );

        that.featureLine.attr("d", that.path);
    }
};

SpiderViz.prototype.updateVis = function(extent){
    var selectedLines = d3.selectAll(".theSpiderLines");
    if (extent[0]===extent[1]) {
        selectedLines.classed("hide", false)
    } else {
        selectedLines.classed("hide", function(d) {
                if (d.val < extent[0] || d.val > extent[1]){
                    return true
                } else {
                    return false
                }

        })
    }
};

SpiderViz.prototype.projectPoint = function (x, y) {
    that = spider_viz;
    var point = that.parentElement.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
};

SpiderViz.prototype.loaded = function(taz, spider) {

    that = spider_viz;
    that.Mtaz = taz;
    that.links = [];
    that.vals = [];


    that.links.push(9)
    tazById = d3.map();

    that.svg = d3.select(that.parentElement.getPanes().overlayPane).append("svg").attr("id","theSpiderSVG");
    that.g = that.svg.append("g");
    that.transform = d3.geo.transform({point: that.projectPoint});

    that.path = d3.geo
        .path()
        .projection(that.transform);

    topojson.feature(that.Mtaz, taz.objects.tazCenter).features.forEach(function(d) {
        tazById.set(d.properties.TAZ, d.geometry.coordinates);
        d.properties.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
    });

    spider.forEach(function(d) {
        that.links.push({
            type: "LineString",
            coordinates: [tazById.get(d.O)
                ,tazById.get(d.D)],
            val: +d.Diff,
            O: d.O,
            D: d.D
        });

        that.vals.push(+d.Diff)
    });

    that.initVis();
    that.spiderHist();

};

SpiderViz.prototype.spiderHist = function(){
    var that = this;

// Generate a Bates distribution of 10 random variables.
    var values = that.vals//d3.range(1000).map(d3.random.bates(10));

// A formatter for counts.
    var formatCount = d3.format(",.0f");

    var margin = {top: 10, right: 30, bottom: 30, left: 50},
        width = 600 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([d3.min(values), d3.max(values)])
        .range([0, width]);

// Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(100))
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

    var svg = d3.select("#spiderHist").append("svg").attr("id", "theSpiderHist")
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
        .attr("width", function(d){return (width/100)-2})
        .attr("height", function(d) { return height - y(d.y); });

    svg.append("g")
        .attr("class", "brush")
        .call(d3.svg.brush().x(x)
            .on("brush", brushed))
        .selectAll("rect")
        .attr("height", height);

    function brushed() {
        var s = d3.event.target.extent();
        that.updateVis(s)
        //svg.classed("selecting", true);
    }

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);


};

SpiderViz.prototype.changeMode = function(e){
    var that = this;

    console.log("removed or not")
    var mode = e.innerText === "Auto" ? that.auto :
        e.innerText === "Transit" ? that.transit :
            e.innerText === "Total" ? that.total :
            null;
    that.loaded(that.taz, mode)
};