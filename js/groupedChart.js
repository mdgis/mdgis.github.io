/**
 * Created by mdowd on 4/10/15.
 */
GroupChartVis = function(_parentElement, _data){
    this.parentElement = _parentElement;
    this.margin = {top: 20, right: 0, bottom: 30, left: 50};
    this.width = 800 - this.margin.left - this.margin.right;
    this.height = 400 - this.margin.top - this.margin.bottom;

    this.data = _data;
    this.initVis();
};



GroupChartVis.prototype.initVis = function() {
    that = this;
    this.x0 = d3.scale.ordinal()
        .rangeRoundBands([0, that.width], .1);

    this.x1 = d3.scale.ordinal();

    this.y = d3.scale.linear()
        .range([that.height, 0]);

    this.color = d3.scale.ordinal()
        .range(["#98abc5", "#a05d56", "#d0743c", "#ff8c00"]);

    this.xAxis = d3.svg.axis()
        .scale(that.x0)
        .orient("bottom");

    this.yAxis = d3.svg.axis()
        .scale(that.y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    this.svg = d3.select(this.parentElement).append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.updateVis();
};

GroupChartVis.prototype.updateVis = function(){
    that = this;

    d3.csv("data/assets/groupJobs.csv", function(error, data) {
        var jobType = d3.keys(data[0]).filter(function (key) {
            return key !== "Level";
        });

        data.forEach(function (d) {
            d.jobs = jobType.map(function (name) {
                return {name: name, value: +d[name]};
            });
        });

        that.x0.domain(data.map(function (d) {
            return d.Level;
        }));
        that.x1.domain(jobType).rangeRoundBands([0, that.x0.rangeBand()]);
        that.y.domain([0, d3.max(data, function (d) {
            return d3.max(d.jobs, function (d) {
                return d.value;
            });
        })]);

        that.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + that.height + ")")
            .call(that.xAxis);

        that.svg.append("g")
            .attr("class", "y axis")
            .call(that.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Jobs");

         that.slrLevel = that.svg.selectAll(".slrLevel")
            .data(data)
            .enter().append("g")
            .attr("class", "g")
            .attr("transform", function (d) {
                return "translate(" + that.x0(d.Level) + ",0)";
            });

        that.slrLevel.selectAll("rect")
            .data(function (d) {
                return d.jobs;
            })
            .enter().append("rect")
            .attr("width", that.x1.rangeBand())
            .attr("x", function (d) {
                return that.x1(d.name);
            })
            .attr("y", function (d) {
                return that.y(d.value);
            })
            .attr("height", function (d) {
                return that.height - that.y(d.value);
            })
            .style("fill", function (d) {
                return that.color(d.name);
            });

        that.legend = that.svg.selectAll(".legend")
            .data(jobType.slice())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        that.legend.append("rect")
            .attr("x", that.width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", that.color);

        that.legend.append("text")
            .attr("x", that.width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d) { return d; });

    })

};
