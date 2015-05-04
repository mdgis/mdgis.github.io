/**
 * AssetVis object for HW3 of CS171
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _label -- label for chart
 * @constructor
 */

AssetVis = function(_parentElement, _data, _label){
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.normal = false;
    this.label = _label;
    this.totalAssets = 0;
    this.denominator = 1;


    // define all constants here
    this.margin = {top: 30, right: 50, bottom: 30, left: 80};
    this.width = 340 - this.margin.left - this.margin.right;
    this.height = 200 - this.margin.top - this.margin.bottom;
    this.initVis();
};


/**
 * Method that sets up the SVG and the variables
 */
AssetVis.prototype.initVis = function(){
    var that = this; // read about the this
    this.svg = this.parentElement.append("svg")
        .attr("id",this.label.split(" ")[0])
        .attr("class", "littleCharts")
        .on("click", function(d,i){
            console.log("Clicked Svg")
            var level = $("#AssetSlider").val();
            var dim = this.id;
            console.log(dim, level)
            map3.removeLayer(asset_map_viz.Features);
            asset_map_viz.wrangleDemData(Demographics[dim.toLocaleLowerCase()], dim.toUpperCase(), level)
        })
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.svg.append("text")
        .attr("x", (this.width / 2))
        .attr("y", 0 - (this.margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(that.label);

    // creates axis and scales
    this.y = d3.scale.linear().range([that.height, 0]);

    this.x = d3.scale.ordinal()
        .rangeRoundBands([0, that.width], .1);

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom");

    this.xAxis.tickFormat(function(d,i){
        return String(i+1) + "ft."});


    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left");


    this.svg.append("g")
        .attr("class", "bars")
        .attr("transform", "translate(0," + 0 + ")");

    this.bargroup = this.svg.select(".bars");


    this.bars = that.bargroup
        .selectAll(".rect")
        .data(d3.range(6))
        .enter()
        .append("rect")
        .attr("class","assetBar")
        .attr("class", function(d,i){ return "s" + String(i) + " " + "assetBar "  + that.label})
        .style("fill", function(d,i){
            return that.label === "Jobs" ? golden[i+1] : that.label === "Pop" ? bluish[i] : that.label === "hh" ? redish[i]
                : golden[i]
        })
        .style("opacity", 0.8)
        .style("stroke", "white")
        .style("stroke-width", 1)
        .attr("x", function(d,i){ return that.x(i); })


    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")");

    this.svg.append("g")
        .attr("class", "y axis");

    // filter, aggregate, modify data
    this.wrangleData();

    // call the update method
    this.updateVis(true);
};

AssetVis.prototype.wrangleData= function(){
    // displayData should hold the data which is visualized
    //this.displayData = this.filterAndAggregate(_filterFunction);
    var totals = {};
    for (var key in this.data[0]){
        totals[key] = 0
    }

    this.data.forEach(function(d){
        for (var key in d){
        totals[key] += d[key]}
        });

    delete totals["TAZ"];
    this.displayData = [];
    for (var key in totals){this.displayData.push(totals[key])}
    this.totalAssets = this.displayData[6];
    this.displayData = this.displayData.slice(0,6);

};


/**
 * the drawing function - should use the D3 selection, enter, exit
 */
AssetVis.prototype.updateVis = function(first){
    var that = this;
    that.denominator = that.normal ? that.totalAssets : 1;
    //this.normal = true;
    //Get the Sum of all votes
    if (first){
        this.y.domain([0, d3.max(this.displayData, function(d) { return d })]);
        that = this
    }

    this.x.domain(this.displayData.map(function(d,i) {return i; }));

    //console.log(d3.max(this.displayData, function(d) {return d/that.totalAssets}));
    if (this.normal){
        this.y.domain([0, (0.05 + +(d3.max(this.displayData, function(d) {return d/that.totalAssets}))).toFixed(1)
        ])
    } else {
        this.y.domain([0, d3.max(this.displayData, function(d) { return d })]);}

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left");

    // updates axis
    this.svg.select(".x.axis").call(this.xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d){
            "use strict";
            return "rotate(-65)";
        });

    this.svg.select(".y.axis").transition().call(this.yAxis);
    this.bars = this.svg.selectAll(".assetBar")
        .data(this.displayData);


    if (first) {
        this.bars
            .attr("x", function (d, i) {
                return that.x(i);
            })
            .attr("y", function (d) {
                return that.y(d);}
            )
            .attr("width", that.x.rangeBand());
    }

    this.bars.transition()
        .attr("height", function(d) {
            //var pad = num_votes > 1 ? 275 : 0;
            return   (that.y(0) - (that.y(d/that.denominator)))})
        .attr("y", function (d) {
            return that.y(d/that.denominator);
        });
};

AssetVis.prototype.normalize = function(){
    console.log("in normalize");
    this.normal = !this.normal;
    this.updateVis(false)
};

//Below changes the bar border to black when a bar is selected & then back to white when unselected
AssetVis.prototype.indicateSelected = function(theBar){
    var bar = d3.select(theBar);
    var selectColor = bar.style("stroke") === "rgb(0, 0, 0)" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
    bar.style("stroke",selectColor)
};

