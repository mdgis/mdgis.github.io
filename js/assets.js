var gradient = golden;

AssetMapVis = function() {
    var assetMap;
    this.initViz();
};


AssetMapVis.prototype.initViz = function(){
    this.wrangleData(jobs, "jobs", 1)
};

AssetMapVis.prototype.updateVis = function() {
   // that = this;
    this.classify = chloroQuantile(this.classMap.values(), 8, "jenks")

    function getColor(d, colorObject) {
        d = assetMap.get(d);
        return d > that.classify[7] ? colorObject[1] :
                 d > that.classify[6]  ? colorObject[2] :
                    d > that.classify[5]  ? colorObject[3] :
                       d > that.classify[4]  ? colorObject[4] :
                            d > that.classify[3]   ? colorObject[5] :
                                d > that.classify[2]   ? colorObject[6] :
                                    d > that.classify[1]   ?colorObject[7] :
                                    'none';
    }

    function style(feature) {
        return {
            fillColor: getColor(feature.properties.TAZ, gradient),
            weight: 0.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }

    this.rawTaz = L.geoJson(rawTaz, {
        style: style
    }).addTo(map);
};



AssetMapVis.prototype.wrangleData = function(dim, label, level){
    console.log("Label", label)
    gradient = label.toLocaleLowerCase() === "jobs" ? golden : label.toLocaleLowerCase() === "pop" ? bluish:
        label.toLocaleLowerCase() === "hh" ? redish : golden;
    this.classMap = d3.map();
    that = this;
    console.log(Demographics[label.toLowerCase()], "BASE_" + label.toUpperCase());
    Demographics[label.toLowerCase()].forEach(function(d){
        that.classMap.set(d.TAZ, d[label.toUpperCase() +"_" + 6 + "ft"])
    });

    console.log(this.classMap)

    assetMap = d3.map();
    dim.forEach(function(d) {
        assetMap.set(d.TAZ, d[label.toUpperCase()+"_"+level+"ft"]);
    });

    this.updateVis();
};