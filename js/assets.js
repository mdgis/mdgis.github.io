var gradient = golden;
var currentAsset = null;
var assetMap = null;
//TODO allow user to turn off the water layer
//TDOD try to get the asset layer above the water or make the water layer not cliablce
assetsGlobals = {
    "highlightSlrFeatures" : function(level){
        var check = asset_map_viz.Assets.selected;
        if (check === "Roads" ){
            asset_map_viz.Assets.roads.eachLayer(function(layer){
                //console.log(layer.feature.properties.slr_lvl)
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
                console.log("Can i see check", check)
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
    }
};

//Leaflet Style Functions ==> Move to Leaflet Javascript File

function roadStyle(feature) {
    return {
        weight: 0.5,
        opacity: 1,
        color: "gray",
        fillOpacity: 0.7
    };
}

AssetMapVis = function() {
    this.asset_viz = null;
    this.Features = new L.LayerGroup();
    this.initViz("Demographics")
};

AssetMapVis.prototype.initViz = function(selected){
    var that = this;
    console.log("selected", selected);
    currentAsset = selected;
    that.wrangleDemData(Demographics.jobs, "jobs", 1);
};

AssetMapVis.prototype.updateVis = function() {
    var that = this;
    this.classify = chloroQuantile(this.classMap.values(), 8, "jenks");

    var assetStyle = function(feature) {
        return {
            fillColor: getColor(feature.properties.TAZ, gradient),
            weight: 0.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    };

    function onEachFeature(feature, layer) {
        // does this feature have a property named popupContent?
        if (feature.properties && feature.properties.STATION) {
            layer.bindPopup(feature.properties.STATION);
        } else if (feature.properties && feature.properties["STOP_NAME"]) {
            layer.bindPopup(feature.properties["STOP_NAME"]);
        } else if (feature.properties && feature.properties["ROUTEKEY"]) {
            layer.bindPopup(feature.properties["ROUTEKEY"]);
        } else if (feature.properties && feature.properties["LINE"]) {
            layer.bindPopup(feature.properties["LINE"]);
        } else if (feature.properties && feature.properties["NAME"]) {
            layer.bindPopup(feature.properties["NAME"]);
        }



    }


    var getColor = function(d, colorObject) {
        d = assetMap.get(d);
        return d > that.classify[7] ? colorObject[1] :
            d > that.classify[6]  ? colorObject[2] :
                d > that.classify[5]  ? colorObject[3] :
                    d > that.classify[4]  ? colorObject[4] :
                        d > that.classify[3]   ? colorObject[5] :
                            d > that.classify[2]   ? colorObject[6] :
                                d > that.classify[1]   ?colorObject[7] :
                                    'none';
    };
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
       "roads": L.geoJson(indRoads, {style: roadStyle}),
        "taz"  : L.geoJson(rawTaz, {style: assetStyle}),
        "exits" : L.geoJson(exits, {style: function(feature) {
                return {color: "black"};}, pointToLayer: function(feature, latlng) {
                return new L.CircleMarker(latlng, {radius: 5, fillOpacity: 0.85});
        }, onEachFeature: onEachFeature}),
        "busStops": L.geoJson(busStops, {style: function(feature) {
            return {color: "black"};}, pointToLayer: function(feature, latlng) {
            return new L.CircleMarker(latlng, {radius: 4, fillOpacity: 0.85});
        }, onEachFeature: onEachFeature}),
        "T_Lines":L.geoJson(mbtaArc, {style: styles.transitStyle, onEachFeature: onEachFeature}),
        "T_Stops": L.geoJson(T_Stops, {style: function(feature) {
            return {color: "steelBlue"};}, pointToLayer: function(feature, latlng) {
            return new L.CircleMarker(latlng, {radius: 4, fillOpacity: 0.85});
        }, onEachFeature: onEachFeature}),
        "busLines":L.geoJson(transitLines, {onEachFeature: onEachFeature})

    };

    that.updateLayers("taz");
    that.Features.addTo(map3)

};


AssetMapVis.prototype.wrangleDemData = function(dim, label, level){
    console.log("In the wrangelData and this = ", this)
    var that = this;

    gradient = label.toLocaleLowerCase() === "jobs" ? golden : label.toLocaleLowerCase() === "pop" ? bluish:
        label.toLocaleLowerCase() === "hh" ? redish : golden;
    this.classMap = d3.map();
    Demographics[label.toLowerCase()].forEach(function(d){
        that.classMap.set(d.TAZ, d[label.toUpperCase() +"_" + 6 + "ft"])
    });

    assetMap = d3.map();
    dim.forEach(function(d) {
        assetMap.set(d.TAZ, d[label.toUpperCase()+"_"+level+"ft"]);
    });

    that.updateVis();

    if (that.asset_viz === null) {
        console.log("Asset viz", that.asset_viz)
        that.asset_viz = new AssetVis(d3.select("#chart"), Demographics.jobs,  "Jobs");
        that.asset_viz2 = new AssetVis(d3.select("#chart1"), Demographics.pop,  "Pop");
        that.asset_viz3 = new AssetVis(d3.select("#chart2"), Demographics.hh, "hh");
        that.asset_viz4 = new AssetVis(d3.select("#chart3"), Demographics.tazarea, "Taz Area Meters Sq.");
    }

};

//AssetMapVis.prototype.wrnangleOtherData = function(){
//
//}

AssetMapVis.prototype.updateLayers = function(layer){
    this.Features.clearLayers();
    this.Features.addLayer(this.Assets[layer]);
};

