var StreetMapGlobals ={
    "gainOrLoss": "Ridership Increase",
    "viewWater":false,
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
    "updateThePoints" : function(route, searchType){
        if (+route.slice(0,1)) route = String(Math.floor(+route));
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
                    //If visualizing nodes that had increases near a route
                    if (check > 100 && searchType === "Ridership Increase") {
                        for (var i = 0; i<routeNodes.length; i++){
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
                        //If visualizing nodes that decreases near a route
                    } else if (check < -100 && searchType === "Ridership Decrease"){
                        for (var i = 0; i<routeNodes.length; i++){
                            dist  = distance(routeNodes[i].lat,routeNodes[i].lng,d.LatLng.lat, d.LatLng.lng ) ;
                            if (dist < 1){
                                nearGainNodes.push({"A":d.properties.A_1});
                                break
                            } else {
                                if(i === routeNodes.length -1){
                                    ignoreNodes.push(d.properties.A_1)
                                }
                            }
                        }
                    }
                    else {
                        ignoreNodes.push(d.properties.A_1)
                    }
                }
            });

        routeNodes.forEach(function(d){
                var nodeClass = ".n" + d.A;
                    d3.select(nodeClass).transition().duration(2000)
                        .attr("r", function(d) {
                                var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;
                                return check > 200 ? StreetMapGlobals.gainScale(check):
                                    check < -50 ? StreetMapGlobals.lossScale(Math.abs(check)):
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
                        return StreetMapGlobals.gainScale(Math.abs(check));
                        });
            }
        );

        if (routeNodes.length === 0) {allNodes.attr("r", 0)}
    }
};

function distance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var a =
        0.5 - Math.cos((lat2 - lat1) * Math.PI / 180)/2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos((lon2 - lon1) * Math.PI / 180))/2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

//Node Processing - Outputs Nested JSON saying which transit line is at which Transit Stop
d3.tsv("data/PtOnOff.csv", function(data){
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

    var commaFormat = d3.format("0,000");
    var modeLookup = {
        "1" : "Bus",
        "2" : "Bus",
        "3" : "The T",
        "4" : "The T",
        "5" : "Commuter Rail"
    };

    var sorts = {"direction":0, current:null};
    d3.csv("data/transitLineSummary.csv",function(data){

        var tableData = data;
        // render the table
        var peopleTable = tabulate(data, ["Route","Mode","Base Ridership", "4ft Ridership","Difference"]);

    });

    function sortTable(h){
        sorts.direction += 1;
        var method=null;
        d3.select("#fullTable").selectAll(".tableRows").sort(function(a,b){
            if (h === "Route") {
                return sorts.direction % 2 === 0 && sorts.current === h ? naturalCompare(a[h], b[h]) :
                    naturalCompare(b[h], a[h])
            } else {
                return sorts.direction % 2 === 0 && sorts.current === h ? a[h]-b[h] : b[h]-a[h]

            }

        });
        sorts.current = h;
    }

    //below source: http://stackoverflow.com/questions/15478954/sort-array-elements-string-with-numbers-natural-sort
    function naturalCompare(a, b) {
        var ax = [], bx = [];

        a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
        b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });

        while(ax.length && bx.length) {
            var an = ax.shift();
            var bn = bx.shift();
            var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
            if(nn) return nn;
        }

        return ax.length - bx.length;
    }
    function tabulate(data, columns) {
        var that = street_viz;

        var table = d3.select("#DataSelection").append("table")
                .attr("id","fullTable")
                .attr("style", "margin-left: 250px")
                .attr("class", "TransitSelector"),
            tbody = table.append("tbody");

        var masterHead = d3.select("#masterHead").append("table")
                .attr("style", "margin-left: 250px")
                .attr("class", "TransitSelector"),
            Mthead = masterHead.append("thead");

        // append the header row
        Mthead.append("tr")
            .selectAll("th")
            .data(columns)
            .enter()
            .append("th")
            .on("click",function(d){
                sortTable(d)
            })
            .attr("class", function(d){
                return "m" + d.split("_")[1]
            })
            .text(function(column) { return column; });


        // create a row for each object in the data
        var rows = tbody.selectAll("tr")
            .data(data)
            .enter()
            .append("tr")
            .on("click", function(d){
                street_viz.updateAssetInfo(d.Route);
                StreetMapGlobals.selectTransitLine(d.Route);
                StreetMapGlobals.updateThePoints(d.Route,StreetMapGlobals.gainOrLoss);
            })
            .attr("class","tableRows");

        // create a cell in each row for each column
        var cells = rows.selectAll("td")
            .data(function(row) {
                return columns.map(function(column) {
                    return {column: column, value: row[column]};
                });
            })
            .enter()
            .append("td")
            .html(function(d) {
                if ( d.column === "Mode" ){
                    return modeLookup[d.value]
                } else if (d.column === "Route"){
                    if (!isNaN(+d.value.slice(0,2))) {
                        return Math.floor(+d.value)
                    } else {
                        return d.value
                    }
                } else {
                    return commaFormat(Math.round(d.value))
                }
            });
        return table;
    }
};

StreetMapVis.prototype.initVis = function(){
    var that = this;
    $("#RI").addClass("selectedButton");


    this.TransitLines = L.geoJson(transitLines, {
        style: styles.transitStyle,
        onEachFeature: null
    }).addTo(map);

    map._initPathRoot();

    var Tlegend = L.control( { position: 'bottomright' } );
    Tlegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'transitLegend');

        return div
    };
    Tlegend.addTo(map);

    //We pick up the SVG from the map object
    this.svg = d3.select("#map").select("svg");
    this.g = this.svg.append("g").attr("class","displayed");

    // D3 Overlay Stuff
    d3.json("data/transitNodes4ft.json", function(collection) {
        var that = street_viz;
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
                .range([1,30]);

        StreetMapGlobals.lossScale = d3.scale.sqrt()
            .domain([0, d3.max([Math.abs(that.extent[0]), that.extent[1]])])
            .range([1,30]);

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
                    return check < 0 ? "#abcc19": check > 0 ? "Blue": null}
            })
            .attr("r", function(d) {
                if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined){
                    var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;

                return check > 200 ? StreetMapGlobals.gainScale(check) :
                            check < -50 ? StreetMapGlobals.lossScale(Math.abs(check)) :
                                check === 0 ? 0 : 0}
            })
            .style("opacity", 0.3)
            .style("stroke", "black")
            .on("click", function(){
                var check = StreetMapGlobals.rootNodes[this.__data__.properties["A_1"]].Lines;
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
        that.addLegend()
    });

};

StreetMapVis.prototype.resetVis = function(){
    var that = this;
    $(".streetInfo").remove();
    that.g.selectAll("circle")
        .transition().duration(1000)
        .attr("r", function(d) {
            if (StreetMapGlobals.rootNodes[d.properties["A_1"]] !== undefined){
                var check = StreetMapGlobals.rootNodes[d.properties["A_1"]].Total;

                return check > 200 ? StreetMapGlobals.gainScale(check) :
                    check < -50 ? StreetMapGlobals.lossScale(Math.abs(check)) :
                        check === 0 ? 0 : 0}
        });
    that.TransitLines.eachLayer(function(layer){
        layer.setStyle(styles.transitStyle(layer.feature))
    });
    that.resetPie();

};

StreetMapVis.prototype.LinesAtStop = function(data){
    var that = this;
    that.pieRadius = 90;
    that.pieWidth = 550;
    that.pieHeight = 250;
    that.pieLabelr = that.pieRadius+10;

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
        .innerRadius(60);

    that.piePath = that.routeStopSVG.selectAll("arc")
        .data(that.pie(that.pieData))
        .enter().append("path")
        .attr("fill", "white")
        .attr("stroke", "black")
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

    })

};

StreetMapVis.prototype.resetPie = function() {
    var that = street_viz;
    that.pieData = [0, 0, 0, 1, 0, 0, 0, 0, 0, 0];
    d3.selectAll(".pieText").remove();
    that.piePath = that.piePath.data(that.pie(that.pieData)); // compute the new angles
    that.piePath
        .style("fill", function (d, i) {
            return i === 0 ? "white" : i === 1 ? "white" : null;
        })
        .style("stroke", "black")
        .style("opacity", 0.5)
        .transition().duration(150).attrTween("d", arcTween); // redraw the arcs
};

StreetMapVis.prototype.UpdateLinesAtStop = function(selectedRouteData){
    var that = street_viz;
    that.pieData = [0,0,0,1,0,0,0,0,0,0];

    that.piePath = that.piePath.data(that.pie(that.pieData)); // compute the new angles
    that.piePath
        .style("fill", function(d,i){
            return i === 0 ? "white" : i===1 ? "white" : null;
        })
        .style("stroke", "black")
        .style("opacity", 0.5)
        .transition().duration(150).attrTween("d", arcTween); // redraw the arcs


    setTimeout(execute, 200);

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
                return +selectedRouteData[routes[i]] < 0 ? "orange" : d.data > 0 ? "Blue" : "none";
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
            setTimeout(that.resetPie, 60000)
        });

        that.routeStopSVG.append("text")
            .attr("class", "pieText")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,-10)")
            .text(d3.format("0,000")(Math.floor(total)));

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
    var that = street_viz;
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
        return that.arc(i(t));
    };
}

StreetMapVis.prototype.addLegend = function() {
    var that = this;
    //d3.selectAll(".accessLegendRect").remove();
    d3.selectAll(".transitLegendSVG").remove();
    var legendData = [500,15000,30000];
    //var legendData = [{loss:20000,goin:0},{loss:10000,gain:0},{loss:500,gain:0}]
    var legendHeight = 170;

    var legend = d3.select("div.transitLegend")
        .append("svg")
        .attr("class","transitLegendSVG")
        .attr("width",100)
        .attr("height",legendHeight)
        .append("g")
        .attr("transform", "translate(0," + (legendHeight-20) + ")")
        .selectAll("g.transitLegend")
        .data(legendData.reverse())
        .enter()
        .append("g")
        .attr("class", "transitLegend");

    var ls_w = 30;
    var initial = 0;
    var xOffset = 43;
    legend.append("circle")
        .attr("class","transitLossCircle")
        .attr("r", function(d) {
            return StreetMapGlobals.lossScale(d)

        })
        .attr("cx", xOffset)
        .attr("cy", function(d){

            return -StreetMapGlobals.lossScale(d)
        })
        .style("stroke", "white")
        .style("stroke-width",2)
        .style("fill", "orange")
        .style("opacity", 0.5);

    legend.append("circle")
        .attr("class","transitGainCircle")
        .attr("r", function(d) {
            return StreetMapGlobals.lossScale(d)

        })
        .attr("cx", xOffset)
        .attr("cy", function(d){

            return -StreetMapGlobals.lossScale(d) - legendHeight/2 +10
        })
        .style("stroke", "white")
        .style("stroke-width", 2)
        .style("fill", "blue")
        .style("opacity", 0.5);

    legend.append("text")
        .attr("x", xOffset)
        .attr("y", -legendHeight+30)
        .attr('text-anchor', 'middle')
        .text("Increased");

    legend.append("text")
        .attr("x", xOffset)
        .attr("y", -legendHeight/2+22)
        .attr('text-anchor', 'middle')
        .text("Decreased");

};

StreetMapVis.prototype.updateAssetInfo = function(route){
    var that = this;
    $(".streetInfo").remove();
    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'streetInfo');
        this.update(route);
        return this._div;
    };

    //Control FLow for Labels - sort of a mess but running out of time.

    info.update = function (asset) {
        this._div.innerHTML = '<h4>' + asset + '</h4>'
    };
    info.addTo(map);


};

StreetMapVis.prototype.toggleWater = function(bool){
    var that = this;
    if (bool){
        addWater(4,map)
    } else {
        addWater(0,map)
    }

};

