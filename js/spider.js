/**
 * Created by mdowd on 4/10/15.
 */
//TODO add legend
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
        .defer(d3.csv, "data/spider/diffAuto2ftClean.csv")
        .defer(d3.csv, "data/spider/diffAuto3ftClean.csv")
        .defer(d3.csv, "data/spider/diffAuto4ftClean.csv")
        .defer(d3.csv, "data/spider/diffAuto5ftClean.csv")
        .defer(d3.csv, "data/spider/diffAuto6ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt1ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt2ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt3ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt4ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt5ftClean.csv")
        .defer(d3.csv, "data/spider/diffpt6ftClean.csv")
        .defer(d3.csv, "data/spider/total1ftClean.csv")
        .defer(d3.csv, "data/spider/total2ftClean.csv")
        .defer(d3.csv, "data/spider/total3ftClean.csv")
        .defer(d3.csv, "data/spider/total4ftClean.csv")
        .defer(d3.csv, "data/spider/total5ftClean.csv")
        .defer(d3.csv, "data/spider/total6ftClean.csv")

        .await(this.ready);

};

SpiderViz.prototype.ready = function(error,taz,auto2,auto3,auto4,auto5,auto6,pt1,pt2,pt3,pt4,pt5,pt6,t1,t2,t3,t4,t5,t6) {
    var that = spider_viz;
    that.taz = taz;
    that.spiderData = {
        "current": "auto",
        "auto2": auto2,
        "auto3": auto3,
        "auto4": auto4,
        "auto5": auto5,
        "auto6": auto6,
        "pt1": pt1,
        "pt2": pt2,
        "pt3": pt3,
        "pt4": pt4,
        "pt5": pt5,
        "pt6": pt6,
        "t1": t1,
        "t2": t2,
        "t3": t3,
        "t4": t4,
        "t5": t5,
        "t6": t6
    };

    that.initSpiderHist();

};

SpiderViz.prototype.initVis = function(){
    var that = this;
    that.vMax = d3.max(that.links, function(d) {return Math.abs(d.val)});
    that.vScale = d3.scale.linear()
        .domain([10,that.vMax])
        .rangeRound([0,30]);

    that.oScale = d3.scale.linear()
        .domain([10,that.vMax])
        .range([.1,.8]);

    that.color = d3.scale.linear()
        .domain([50,250,500,1000,3000,5000,that.vMax])
        .range(["black","purple","darkblue","blue","red", "orange", "yellow"]);


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
        .attr("r", 4)
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

    that.updateSpiderHist();
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
    var that = spider_viz;
    var point = that.parentElement.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
};

SpiderViz.prototype.loaded = function(taz, spider) {
    var that = spider_viz;
    that.Mtaz = taz;
    that.links = [];
    that.spiderHistVals = [];

    //that.links.push(9);
    var tazById = d3.map();

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
            coordinates: [tazById.get(Math.floor(d.O))
                ,tazById.get(Math.floor(d.D))],
            val: +d.DIFF,
            O: d.O,
            D: d.D
        });

        that.spiderHistVals.push(+d.DIFF)
    });

    that.initVis();


};

SpiderViz.prototype.initSpiderHist = function(){
    var that = this;

    // A formatter for counts.
    var formatCount = d3.format(",.0f");

    that.SPHmargin = {top: 10, right: 30, bottom: 30, left: 50};
    that.SPHwidth = 600 - that.SPHmargin.left - that.SPHmargin.right;
    that.SPHheight = 500 - that.SPHmargin.top - that.SPHmargin.bottom;

    that.spiderHistSvg = d3.select("#spiderHist").append("svg").attr("id", "theSpiderSVG")
        .attr("width", that.SPHwidth + that.SPHmargin.left + that.SPHmargin.right)
        .attr("height", that.SPHheight + that.SPHmargin.top + that.SPHmargin.bottom)
        .append("g")
        .attr("transform", "translate(" + that.SPHmargin.left + "," + that.SPHmargin.top + ")");

    that.SPHx = d3.scale.linear()
        .range([0, that.SPHwidth]);

    that.SPHy = d3.scale.pow().exponent(.5);

    that.SPHy
        .domain([0,50 ])
        .range([that.SPHheight, 0]);

    that.SPHxAxis = d3.svg.axis()
        .scale(that.SPHx)
        .orient("bottom");

    that.SPHyAxis = d3.svg.axis()
        .scale(that.SPHy)
        .orient("left");



    that.spiderHistSvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + that.SPHheight + ")")
        .call(that.SPHxAxis)
        .append("text")
        .attr("x", 25)
        .attr("y", 18)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Value");


    that.spiderHistSvg.append("g")
        .attr("class", "y axis")
        .call(that.SPHyAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency");
};

SpiderViz.prototype.updateSpiderHist = function(){
    var that = this;
    that.SPHx.domain([d3.min(that.spiderHistVals), d3.max(that.spiderHistVals)]);

    d3.selectAll(".spiderBar").remove();
    // Generate a histogram using 100(data is heavily skewed) uniformly-spaced bins.
    that.SPHdata = d3.layout.histogram()
        .bins(that.SPHx.ticks(100))
        (that.spiderHistVals);

    that.SPHy
        .domain([0, 10 + d3.max(that.SPHdata, function(d) { return d.y; })])
        .range([that.SPHheight, 0]);

    that.SPHjoin = that.spiderHistSvg.selectAll(".spiderBar")
        .data(that.SPHdata);

    that.SPHbar =
        that.SPHjoin
        .enter()
        .append("g")
        .attr("class", "spiderBar");

    that.SPHbar.append("rect")
        .attr("x", function(d){return that.SPHx(d.x)});

    that.SPHjoin.selectAll("rect").transition().duration(500)
        .attr("y", function(d){return that.SPHy(d.y)})
        .attr("width", function(d){return Math.ceil(that.SPHwidth/100)-1})
        .attr("height", function(d) { return that.SPHheight - that.SPHy(d.y); })
        .style("fill", function(d) {
            return that.color(Math.abs(d.x))});


    that.SPHjoin.exit().remove();

    that.spiderHistSvg.append("g")
        .attr("class", "brush")
        .call(d3.svg.brush().x(that.SPHx)
            .on("brush", brushed))
        .selectAll("rect")
        .attr("height", that.SPHheight);





    function brushed() {
        var s = d3.event.target.extent();
        that.updateVis(s);
    }

    that.spiderHistSvg.select(".y.axis")
        .transition().duration(750)
        .call(that.SPHyAxis)


    that.spiderHistSvg.select(".x.axis")
        .transition().duration(750)
        .call(that.SPHxAxis);



};

SpiderViz.prototype.changeMode = function(e){
    var that = this;
    var level = $("#LostSlider").val();
    var spider = e.innerText === "Auto" ? "auto"  :
        e.innerText === "Transit" ? "pt" :
            e.innerText === "Total" ? "t" :
            null;
    d3.selectAll(".spiderBar").remove();
    if (spider !== null){
        that.spiderData.current = spider;
        that.loaded(that.taz, that.spiderData[spider+level]);
    }
};