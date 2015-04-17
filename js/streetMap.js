StreetMapVis = function(){
    this.initVis()
};


StreetMapVis.prototype.initVis = function(){
    that = this;

    function transitStyle(feature) {
        return {
            weight: setWeight(feature.properties["MODE"]),
            color: setColor(feature.properties["MODE"], feature.properties["NAME"])
        };
    }


    function setWeight(mode){
        return (mode === 1) || (mode === 2) ? 1 :
            (mode === 3) || (mode === 4) ? 7:
                (mode === 5) ? 3: null
    }

    function setColor(mode, name){
        /*Color the subways by their name */
        name = name.toLowerCase();
        if ((mode === 1) || (mode === 2)){
            return "yellow"
        }
        else if ( (mode === 3) || (mode === 4) ) {
            if (name.indexOf("red") > -1){
                return "#E22322"

            }
            else if (name.indexOf("green") > -1){
                return "#018445"
            }
            else if (name.indexOf("blue") > -1) {
                return "#007AC2"
            }
            else if (name.indexOf("orange") > -1) {
                return "#F3891D"
            }
        }
        else if (mode === 5){
            return "gray"
        }
        else {return null}
    }


    this.TransitLines = L.geoJson(transitLines, {
        style: transitStyle,
        onEachFeature: null
    }).addTo(map);


    map._initPathRoot();

    //We pick up the SVG from the map object
    this.svg = d3.select("#map").select("svg");
    this.g = this.svg.append("g").attr("class","displayed");

    // D3 Overlay Stuff

    d3.json("data/transitNodes4ft.json", function(collection) {
        that = street_viz;

        //var transform = d3.geo.transform({point: projectPoint}),
        //    path = d3.geo.path().projection(transform);

        var extent = d3.extent(collection.features.map(function(d){return d.properties["diff"]}));

        var gainScale = d3.scale.sqrt()
                .domain([0,extent[1]])
                .range([1,20])

        var lossScale = d3.scale.sqrt()
            .domain([0, Math.abs(extent[0])])
            .range([1,20]);

        collection.features.forEach(function(d) {
            d.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
        });

        var feature = that.g.selectAll("circle")
            .data(collection.features)
            .enter().append("circle")
            .style("fill", function(d){
                var check = d.properties["diff"];
                return check < 0 ? "orange": check > 0 ? "blue": null
            })
            .attr("r", function(d) {
                if (map.getZoom() <= 13){
                    var check = d.properties["diff"];
                } else {
                    check = d.properties["diff"]
                }
                return check > 200 ? gainScale(check) :
                            check < -50 ? lossScale(Math.abs(check)) :
                                check === 0 ? 0 : 0
            })
            .style("opacity", 0.3)
            .style("stroke", "black")
            .on("click", function(){console.log("Loss #", this.__data__.properties["diff"], "trips")});

        map.on("viewreset", reset);
        reset();

        // Reposition the SVG to cover the features.
        function reset() {
            feature.attr("transform",
                function(d) {
                    return "translate("+
                        map.latLngToLayerPoint(d.LatLng).x +","+
                        map.latLngToLayerPoint(d.LatLng).y +")";}
            )
        }

        function projectPoint(x, y) {
            var point = map.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }


    });
};








