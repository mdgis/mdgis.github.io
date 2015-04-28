//TODO need to add legend
//TODO need to add button that clears the selection
var StreetMapGlobals ={
    "rootNodes": {},
    "gainScale": null,
    "lossScale": null,
    "selectTransitLine" : function(lineName){
        street_viz.TransitLines.eachLayer(function(layer){
            if (lookUp[layer.feature.properties.NAME] !== lineName){
                layer.setStyle({color :'black', weight: 1})
            } else {
                layer.setStyle(styles.transitStyle(layer.feature));
                layer.setStyle({weight: 10})
            }
        })
     },
    "updateThePoints" : function(route){
        //console.log("in the update points", route+"_");
        route = route.trim();
        var routeNodes=[];
        var allNodes = d3.selectAll(".transitChange");
        var nearGainNodes = [];
        var ignoreNodes =[];

            allNodes.each(function(d){
                var check1 = StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined;
                var check2 = Object.keys(StreetMapGlobals.rootNodes[d.properties.A_1].Lines).indexOf(route) > -1;
                if (check1 && check2){
                    routeNodes.push({"A":d.properties.A_1, "lat":d.LatLng.lat, "lng": d.LatLng.lng })
                }
            });

            allNodes.each(function(d){
                var check1 = StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined;
                var check2 = Object.keys(StreetMapGlobals.rootNodes[d.properties.A_1].Lines).indexOf(route) == -1;

                if (check1  && check2 ) {
                    var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                    if (check > 100) {
                        for (i = 0; i<routeNodes.length; i++){
                            var dist  = distance(routeNodes[i].lat,routeNodes[i].lng,d.LatLng.lat, d.LatLng.lng ) ;
                            if (dist < 1){
                                nearGainNodes.push({"A":d.properties.A_1});
                                break
                            } else {
                                if(i === routeNodes.length -1){
                                    ignoreNodes.push(d.properties.A_1)
                                }
                            }
                        }
                    } else {
                        ignoreNodes.push(d.properties.A_1)
                    }
                }
            });



        console.log("Route Nodes", routeNodes.length, "GainNodes", nearGainNodes.length);
        console.log("ignoreNodes length", ignoreNodes.length)
        routeNodes.forEach(function(d){
                var nodeClass = ".n" + d.A;
                    d3.select(nodeClass).transition().duration(2000)
                        .attr("r", function(d) {
                                var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                                return check > 200 ? StreetMapGlobals.gainScale(check)*1.5:
                                    check < -50 ? StreetMapGlobals.lossScale(Math.abs(check))*1.5:
                                        check === 0 ? 0 : 0})
            }
        );

        ignoreNodes.forEach(function(d){
                var nodeClass = ".n" + d;
                d3.select(nodeClass).transition().duration(1500)
                    .attr("r", 0)
            }
        );

        nearGainNodes.forEach(function(d){
                var nodeClass = ".n" + d.A;
                d3.select(nodeClass).transition().duration(2500)
                    .attr("r", function(d) {
                        var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                        return StreetMapGlobals.gainScale(check)*1.5;
                        });
            }
        );

        if (routeNodes.length === 0) {allNodes.attr("r", 0)};
    }
};

//Node Processing - Outputs Nested JSON saying which transit line is at which Transit Stop
d3.tsv("RawData/PtOnOff.csv", function(data){
    //First Determine all Unique Nodes
    data.forEach(function(d){
        if (!StreetMapGlobals.rootNodes[d.A]) {
            var check = d.A;
            StreetMapGlobals.rootNodes[check] = {Lines: {}, Total: 0
            }
        }
    });

    data.forEach(function(d){
        StreetMapGlobals.rootNodes[d.A].Lines[d.Name] = +d.DiffB4ft;
        StreetMapGlobals.rootNodes[d.A].Total += +d.DiffB4ft;
    });
});



StreetMapVis = function(){
    this.initVis();
    this.LinesAtStop();
    this.canvas = d3.select("#DataSelection").append("svg")
        .attr("width", 750)
        .attr("height", 650);

    d3.json("scratch/transit.json", function(tdata){
        that = street_viz;
        that.treemap = d3.layout.treemap().sticky(true)
            .padding(6)
            .sort(function(a,b){
                if(a.Name){
                    return b.Name.toLocaleLowerCase() - a.Name.toLowerCase()}
                else return true
            })
            .size([750,650])
            .nodes(tdata);

        that.cells = that.canvas.selectAll(".cell")
            .data(that.treemap)
            .enter()
            .append("g")
            .attr("class", "cell");

        that.cells.append("rect")
            .attr("class", function(d){ return "treeMap"})
            .on("click",function(d){
                StreetMapGlobals.selectTransitLine(d.Name);
                StreetMapGlobals.updateThePoints(d.Name);})
            .attr("x",function (d) { return d.x })
            .attr("y", function (d) { return d.y })
            .attr("width", function (d) { return d.dx })
            .attr("height", function (d) { return d.dy })
            .attr("fill", function (d) { return d.children ? "white" :  styles.colorLines(d)})
            .style("stroke", "white");

        that.cells.append("text")
            .attr("x", function (d) { return d.x + d.dx /10})
            .attr("y", function (d) { return d.y + d.dy / 2})
            .text(function (d) {
                if (d.Name !== undefined){
                    if (d.Mode === 5) {
                        return d.Name.slice(0,4).toUpperCase()+"."
                    } else {
                        return cleanText(d.Name)
                    }
                } else {return null}
            })
            .attr("class", "boxText")
            .style("fill", function(d){
                if (d.Mode === 1){
                    return "black"
                }
            });

        function cleanText(d){
            if (!isNaN(d.slice(0,1))){
                return Math.floor(d)
            } else {
                return d
            }
        }
    })
};




StreetMapVis.prototype.initVis = function(){
    that = this;
    this.TransitLines = L.geoJson(transitLines, {
        style: styles.transitStyle,
        onEachFeature: null
    }).addTo(map);

    map._initPathRoot();

    //We pick up the SVG from the map object
    this.svg = d3.select("#map").select("svg");
    this.g = this.svg.append("g").attr("class","displayed");

    // D3 Overlay Stuff
    d3.json("data/transitNodes4ft.json", function(collection) {
        that = street_viz;
        //Only draw circles of nodes that actually changed
        collection.features = collection.features.filter(function(d){
            if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined){
                return true}
        });

        that.extent = d3.extent(collection.features.map(function(d){
            if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined){
                return StreetMapGlobals.rootNodes[d.properties["A_1"]].Total}
        }));

        StreetMapGlobals.gainScale = d3.scale.sqrt()
                .domain([0,that.extent[1]])
                .range([1,20]);

        StreetMapGlobals.lossScale = d3.scale.sqrt()
            .domain([0, Math.abs(that.extent[0])])
            .range([1,20]);

        collection.features.forEach(function(d) {
            d.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
        });

        that.feature = that.g.selectAll("circle")
            .data(collection.features)
            .enter().append("circle")
            .attr("class", function(d) {return "transitChange " + "n" + d.properties["A_1"]})
            .style("fill", function(d){
                if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined) {
                    var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                    return check < 0 ? "#abcc19": check > 0 ? "steelBlue": null}
            })
            .attr("r", function(d) {
                if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined){
                if (map.getZoom() <= 13){
                    var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                } else {
                    check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total
                }
                return check > 200 ? StreetMapGlobals.gainScale(check) :
                            check < -50 ? StreetMapGlobals.lossScale(Math.abs(check)) :
                                check === 0 ? 0 : 0}
            })
            .style("opacity", 0.3)
            .style("stroke", "black")
            .on("click", function(){
                var check = StreetMapGlobals.rootNodes[this.__data__.properties["A_1"]].Lines;
                //console.log("Loss #", JSON.stringify(check, "trips"))
                street_viz.UpdateLinesAtStop(check)
            });

        map.on("viewreset", reset);
        reset();

        // Reposition the SVG to cover the features.
        function reset() {
            that = street_viz;
            that.
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




StreetMapVis.prototype.LinesAtStop = function(data){
    var that = this;;
    that.pieRadius = 70;
    that.pieWidth = 550;
    that.pieHeight = 150;
    that.pieLabelr = that.pieRadius

    that.routeStopSVG = d3.select("#RoutesAtStop").append("svg")
        .attr("width", that.pieWidth)
        .attr("height",  that.pieHeight)
        .append("g")
        .attr("transform", "translate(" + that.pieWidth / 2+ "," + that.pieHeight / 2 + ")");


    that.pie = d3.layout.pie()
        .value(function(d) { return d; })
        .sort(null);

    that.pieData = [1,1,1,1,1,0,0,0,0,0];

    var color = d3.scale.category20();

    that.arc = d3.svg.arc()
        .outerRadius(that.pieRadius - 10)
        .innerRadius(50);

    that.piePath = that.routeStopSVG.selectAll("arc")
        .data(that.pie(that.pieData))
        .enter().append("path")
        .attr("fill", "black")
        .attr("stroke", "white")
        .attr("d", that.arc)
        .each(function(d) { this._current = d; }); // store the initial angles


    that.piePath.each(function(d){
        that.routeStopSVG.append("text")
        .attr("transform", function(j) {

            var c = that.arc.centroid(d),
                x = c[0],
                y = c[1],
            // pythagorean theorem for hypotenuse
                h = Math.sqrt(x*x + y*y);
            return "translate(" + (x/h * that.pieLabelr) +  ',' +
                (y/h * that.pieLabelr) +  ")";
        })
        .attr("dy", ".35em")
        .attr("text-anchor", function(j) {
            // are we past the center?
            return (d.endAngle + d.startAngle)/2 > Math.PI ?
                "end" : "start";
        })
        .text(function(j, i) {
            if (i === 1) return "Click circle to display routes at that stop" });
    })

};

StreetMapVis.prototype.UpdateLinesAtStop = function(selectedRouteData){
    var that = street_viz;
    console.log(that, "that")
    that.pieData = [0,0,0,1,0,0,0,0,0,0];

    console.log(selectedRouteData);
    that.piePath = that.piePath.data(that.pie(that.pieData)); // compute the new angles
    that.piePath
        .style("fill", function(d,i){
            console.log("this I", i )
            return i === 0 ? "black" : i===1 ? "#400000" : null;
        })
        .style("stroke", "black")
        .transition().duration(150).attrTween("d", arcTween); // redraw the arcs


    setTimeout(execute, 200)

    function execute() {
        d3.selectAll(".pieText").remove();
        that.pieData = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        that.refData = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var routes = Object.keys(selectedRouteData);
        routes.forEach(function (d, i) {
            that.pieData[i] = Math.abs(selectedRouteData[d]);
            that.refData[i] = selectedRouteData[d]
        });

        var total = that.refData.reduce(function (previousValue, currentValue, index, array) {
            return previousValue + currentValue;
        });

        that.piePath = that.piePath.data(that.pie(that.pieData)); // compute the new angles
        that.piePath
            .style("fill", function (d, i) {
                return +selectedRouteData[routes[i]] < 0 ? "#700000" : d.data > 0 ? "steelBlue" : "none";
            })
            .style("stroke", "white")
            .transition().duration(750).attrTween("d", arcTween); // redraw the arcs


        that.piePath.each(function (d, i) {
            if (+d.data !== 0){
                that.routeStopSVG.append("text")
                    .attr("class", "pieText")
                    .attr("transform", function (j) {
                        var c = that.arc.centroid(d),
                            x = c[0],
                            y = c[1],
                        // pythagorean theorem for hypotenuse
                            h = Math.sqrt(x * x + y * y);
                        return "translate(" + (x / h * that.pieLabelr) + ',' +
                            (y / h * that.pieLabelr) + ")";
                    })
                    .attr("dy", ".35em")
                    .attr("text-anchor", function (j) {
                        // are we past the center?
                        return (d.endAngle + d.startAngle) / 2 > Math.PI ?
                            "end" : "start";
                    })
                    .text(function (j) {
                        if (["Green", "Orange", "Red", "Blue"].indexOf(routes[i]) > -1) {
                            return routes[i] + " Line" + " :" + selectedRouteData[routes[i]]
                        } else {
                            return routes[i] + " :" + selectedRouteData[routes[i]]
                        }
                    })
                }
        });

        that.routeStopSVG.append("text")
            .attr("class", "pieText")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,-10)")
            .text(d3.format("0,000")(Math.floor(total)))

        that.routeStopSVG.append("text")
            .attr("class", "pieText")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,10)")
            .text(function (d) {
                return total > 0 ? "Increase In" : "Decrease In"
            });

        that.routeStopSVG.append("text")
            .attr("class", "pieText")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,25)")
            .text("Riders");



    }
};


function arcTween(a) {
    that = street_viz
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
        return that.arc(i(t));
    };
}