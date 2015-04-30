TopoStreetMapVis = function(_map, _data){
    this.map = _map;
    this.collection = _data;
    this.initVis();
    this.updateVis(this.collection, "V")
};


///Probably need to fix some of the This & That things

TopoStreetMapVis.prototype.initVis = function() {
    var that = this;
    that.svg = d3.select(that.map.getPanes().overlayPane).append("svg");
    that.g = that.svg.append("g").attr("class", "leaflet-zoom-hide");
    that.gTopoMap = that.g.append("g").attr("class", "gTopoMap displayed");
};

TopoStreetMapVis.prototype.updateVis = function(collection, netAttribute) {
    var that = this;
    var transform = d3.geo.transform({point: projectPoint}),
        path = d3.geo.path().projection(transform);

    var scaleMax = netAttribute === "q" ? 350 : 50;
    var vMax = d3.max(collection.objects['dta'].geometries, function(d) {return d.properties[netAttribute]});
    var vScale = d3.scale.linear()
        .domain([10,vMax])
        .range([1,scaleMax]);

    var feature = that.gTopoMap.selectAll("path")
        .data(topojson.feature(collection, collection.objects['dta']).features);

    feature
        .enter().append("path");



    feature.attr("class","RoadPath").style("stroke-width", function(d){
        return vScale(d.properties[netAttribute])}
        )
        .attr("stroke", function(d){
            return d.properties[netAttribute] > 60 ? "red" : "darkBlue"
        });


    feature.exit().remove();

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








