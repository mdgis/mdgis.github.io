/**
 * Created by mdowd on 4/10/15.
 */

SpiderViz = function(){
    this.Mtaz = null;
    this.links = [];
    this.initVis();

    queue().defer(d3.json, "RawData/tazCtopo.json")
        .defer(d3.csv, "RawData/autoDiff.csv")
        .await(that.loaded);
};

SpiderViz.prototype.initVis = function(){
    that = this;
    console.log("did the init")

};
SpiderViz.prototype.loaded = function(error, taz, spider) {

    that = spider_vis;
    that.Mtaz = taz;
    console.log("in the loaded", that);

    that.links.push(9)
    tazById = d3.map();

    svg = d3.select(map.getPanes().overlayPane).append("svg");
    g = svg.append("g");

    var transform = d3.geo.transform({point: projectPoint})

    var path = d3.geo
        .path()
        .projection(transform);

    topojson.feature(that.Mtaz, taz.objects.tazCenter).features.forEach(function(d) {
        tazById.set(d.properties.TAZ, d.geometry.coordinates);
    });


    spider.forEach(function(d) {
        that.links.push({
            type: "LineString",
            coordinates: [tazById.get(d.O)
                ,tazById.get(d.D)],
            val: d.Diff
        })
    });

    var vMax = d3.max(that.links, function(d) {return Math.abs(d.val)});
    console.log("VMAX", vMax)
    var vScale = d3.scale.linear()
        .domain([10,vMax])
        .range([1,15]);

    var oScale = d3.scale.linear()
        .domain([10,vMax])
        .range([.1,.8]);

    var color = d3.scale.ordinal()
        .domain([10,200,450,700,vMax])
        .range(["#000329","#29022C","#530230", "#7D0133", "yellow"]);


    var featureCentroid = g.attr("class","centroids").attr("class", "leaflet-zoom-hide").selectAll("path")
        .data(topojson.feature(taz, taz.objects.tazCenter).features)
        .enter().append("path").attr("class", "centroids");

    featureCentroid
        .attr("id", function(d) {return d.id;});



    var featureLine = g.append("g").attr("class","spiderLines").attr("class", "leaflet-zoom-hide")
        .selectAll("path")
        .data(that.links)
        .enter().append("path");

    featureLine
        .attr("opacity",function(d) {return oScale(Math.abs(d.val))})
        .style("stroke-width", function(d){
            return vScale(Math.abs(d.val))
        })
        .attr("stroke", function(d){return color(d.val)});


    map.on("viewreset", reset);
    reset();
    // Reposition the SVG to cover the features.
    function reset() {
        var bounds = path.bounds(topojson.feature(taz, taz.objects.tazCenter)),
            topLeft = bounds[0],
            bottomRight = bounds[1];

        svg.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        featureCentroid.attr("d", path);
        featureLine.attr("d", path);
    }

};

function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}
