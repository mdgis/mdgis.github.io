var gradient = golden;
var currentAsset = null;


//TODO Fix the on click bit, just have it change dimension not water level
assetsGlobals = {
    assetMap : null,
    classify: null,
    assetStyle: undefined,
    showWater: true,
    "highlightSlrFeatures" : function(level){
        var check = asset_map_viz.Assets.selected;
        if (check === "Roads" ){
            asset_map_viz.Assets.roads.eachLayer(function(layer){
                if (level === 0 ){
                    layer.setStyle({color :'gray', weight: 1})
                } else if (layer.feature.properties.slr_lvl <= level && layer.feature.properties.slr_lvl !== 0){
                    layer.setStyle({color :'red', weight: 1});
                }
            })
        } else if (check === "Highway Exits" || check === "Bus Stops" || "Bus Lines" || "T-Stops"){
            var asset = check === "Highway Exits" ? "exits" : check === "Bus Stops" ? "busStops" :
                    check === "T-Stops" ? "T_Stops" : check === "Bus Lines" ?  "busLines" : undefined;
            if (asset !== undefined){
                asset_map_viz.Assets[asset].eachLayer(function(layer){
                    if (level === 0 ){
                        layer.setStyle({color :'black', weight: 1})
                    } else if (layer.feature.properties.slr_lvl <= level && layer.feature.properties.slr_lvl !== 0){
                        layer.setStyle({color :'red', weight: 7})
                    } else {
                        layer.setStyle({color :'black', weight: 1});

                    }
                })
            }
        }
    },

    "getColor" : function(d, colorObject) {
        d = assetsGlobals.assetMap.get(d);
        return d > assetsGlobals.classify[7] ? colorObject[1] :
            d > assetsGlobals.classify[6]  ? colorObject[2] :
                d > assetsGlobals.classify[5]  ? colorObject[3] :
                    d > assetsGlobals.classify[4]  ? colorObject[4] :
                        d > assetsGlobals.classify[3]   ? colorObject[5] :
                            d > assetsGlobals.classify[2]   ? colorObject[6] :
                                d > assetsGlobals.classify[1]   ?colorObject[7] :
                                    'none';
    },

    "onEachFeature": function(feature, layer) {
    // does this feature have a property named popupContent?
        if (feature.properties && feature.properties["STATION"]) {
            layer.bindPopup(feature.properties["STATION"]);
        } else if (feature.properties && feature.properties["STOP_NAME"]) {
            layer.bindPopup(feature.properties["STOP_NAME"]);
        } else if (feature.properties && feature.properties["ROUTEKEY"]) {
            layer.bindPopup(feature.properties["ROUTEKEY"]);
        } else if (feature.properties && feature.properties["LINE"]) {
            layer.bindPopup(feature.properties["LINE"]);
        } else if (feature.properties && feature.properties["NAME"]) {
            layer.bindPopup(feature.properties["NAME"]);
        }

        layer.on('mouseover', function (e) {
            this.openPopup();
        });
        layer.on('mouseout', function (e) {
            this.closePopup();
        });
    },

    "roadStyle": function(feature) {
            return {
                weight: 0.5,
                opacity: 1,
                color: "gray",
                fillOpacity: 0.7
            };
        }


};
///////Exiting Viz Object Global///////


AssetMapVis = function() {
    this.asset_viz = null;
    this.Features = new L.LayerGroup();
    this.initViz("Demographics")
};

AssetMapVis.prototype.initViz = function(selected){
    var that = this;
    currentAsset = selected;

    that.Assets = {
        "lookUp":{
            "Roads"         : "Highway",
            "Highway Exits" : "Highway",
            "Bus Stops"     : "Transit",
            "Bus Lines"     : "Transit",
            "T-Stops"       : "Transit",
            "T-Lines"       : "Transit",
            "Demographics"  : "Demographics"
        },
        "selected": "Demographics",
        "demoDim" : "jobs",
        "roads": L.geoJson(indRoads, {style: assetsGlobals.roadStyle}),
        "taz"  : L.geoJson(rawTaz, {}),
        "exits" : L.geoJson(exits, {style: function(feature) {
            return {color: "black"};}, pointToLayer: function(feature, latlng) {
            return new L.CircleMarker(latlng, {radius: 5, fillOpacity: 0.85});
        }, onEachFeature: assetsGlobals.onEachFeature}),
        "busStops": L.geoJson(busStops, {style: function(feature) {
            return {color: "black"};}, pointToLayer: function(feature, latlng) {
            return new L.CircleMarker(latlng, {radius: 4, fillOpacity: 0.85});
        }, onEachFeature: assetsGlobals.onEachFeature}),
        "T_Lines":L.geoJson(mbtaArc, {style: styles.transitStyle, onEachFeature: assetsGlobals.onEachFeature}),
        "T_Stops": L.geoJson(T_Stops, {style: function(feature) {
            return {color: "steelBlue"};}, pointToLayer: function(feature, latlng) {
            return new L.CircleMarker(latlng, {radius: 4, fillOpacity: 0.85});
        }, onEachFeature: assetsGlobals.onEachFeature}),
        "busLines":L.geoJson(transitLines, {onEachFeature: assetsGlobals.onEachFeature})

    };
    that.wrangleDemData(Demographics.jobs, "jobs", 0);

    var legend = L.control( { position: 'bottomright' } );
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'assetLegend hide');

        return div
    };
    legend.addTo(map3)

};

var info = L.control();


AssetMapVis.prototype.updateVis = function() {
    var that = this;
    that.Assets.taz.setStyle(assetsGlobals.assetStyle);
    that.Features.addTo(map3)
};

AssetMapVis.prototype.wrangleDemData = function(dim, label, level) {
    var that = this;
    that.Assets.demoDim = label.toLowerCase();
    gradient = label.toLocaleLowerCase() === "jobs" ? golden : label.toLocaleLowerCase() === "pop" ? bluish :
        label.toLocaleLowerCase() === "hh" ? redish : golden;
    this.classMap = d3.map();
    Demographics[label.toLowerCase()].forEach(function (d) {
        that.classMap.set(d.TAZ, d[label.toUpperCase() + "_" + 6 + "ft"])
    });

    assetsGlobals.assetMap = d3.map();
    dim.forEach(function (d) {
        assetsGlobals.assetMap.set(d.TAZ, d[label.toUpperCase() + "_" + level + "ft"]);
    });


    if (that.asset_viz === null) {
        that.asset_viz = new AssetVis(d3.select("#chart"), Demographics.jobs, "Jobs");
        that.asset_viz2 = new AssetVis(d3.select("#chart1"), Demographics.pop, "Pop");
        that.asset_viz3 = new AssetVis(d3.select("#chart2"), Demographics.hh, "hh");
        that.asset_viz4 = new AssetVis(d3.select("#chart3"), Demographics.tazarea, "Taz Area Meters Sq.");
    }

    assetsGlobals.classify = chloroQuantile(this.classMap.values(), 8, "jenks");
    assetsGlobals.assetStyle = function (feature) {
        return {
            fillColor: assetsGlobals.getColor(feature.properties.TAZ, gradient),
            weight: 0.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    };

    that.updateLayers("taz");
    that.updateAssetInfo();
    if (level === 0){
        that.toggleLegend(true)
    } else {
        that.toggleLegend(false)
        that.addDemLegend();
    }
};


AssetMapVis.prototype.addDemLegend = function() {
    d3.selectAll(".assetLegendRect").remove();
    d3.selectAll(".assetLegendSVG").remove();

    var legendData = assetsGlobals.classify.slice(0)
    legendData = legendData.slice(1,9)
    var legendHeight = 180;
    var legend = d3.select(".assetLegend")
        .append("svg")
        .attr("class","assetLegendSVG")
        .attr("width",100)
        .attr("height",legendHeight)
        .append("g")
        .attr("transform", "translate(0,15)")
        .selectAll("g.legend")
        .data(legendData.reverse())
        .enter()
        .append("g")
        .attr("class", "legend");

    var ls_w = 30, ls_h = 20;

    legend.append("rect")
        .attr("class","assetLegendRect")
        .attr("x", 10)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - 2*ls_h;})
        .attr("width", ls_w)
        .attr("height", ls_h)
        .style("fill", function(d, i) {
                return gradient[i]
        })
        .style("opacity", 0.7);

    legend.append("text")
        .attr("x", 50)
        .attr("y", function(d, i){ return legendHeight - (i*ls_h) - ls_h - 4;})
        .text(function(d, i){ return String(Math.round(legendData[i])) });

};

AssetMapVis.prototype.toggleLegend = function(bool){
    //asset_map_viz.toggleLegend(true)
    d3.select(".assetLegend").classed("hide",bool)
};


AssetMapVis.prototype.updateLayers = function(layer){
    var that = this;
    that.Features.clearLayers();
    that.Features.addLayer(that.Assets[layer]);
    that.updateVis();
};

AssetMapVis.prototype.updateAssetInfo = function(){
    var that = this;
    $(".info").remove();
    info.onAdd = function (map3) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    //Control FLow for Labels - sort of a mess but running out of time.
    var thing = that.Assets.demoDim;
    if (thing === undefined){
        thing = that.Assets.selected === "Demographics" ?  "Jobs" : that.Assets.selected;
    } else {
        thing = thing === "jobs" ? "Jobs" : thing === "pop" ? "Population" : thing === "hh" ? "Households" : null
    }


    info.update = function (asset) {
        this._div.innerHTML = '<h4>' + thing + '</h4>'
    };
    info.addTo(map3);


};