import React, {Fragment} from 'react'
import {
    axisLeft,
    axisBottom,
    mouse,
    scaleTime,
    scaleLinear,
    select,
    extent,
    selectAll,
    line,
    bisector,
    range
} from 'd3';
import {colors} from './Color'
import ArrayUtil from "../../../util/ArrayUtil";
import DateUtil from "../../../util/DateUtil";


export class MonthlyLineChart extends React.Component {

    raw_data = {};
    dates = [];
    beginDate = undefined;
    beginOffset = undefined
    monthOffsetSeries = []
    monthOffsets = []

    shouldShow = true

    constructor(props) {
        super(props)
        const raw_data = this.props.data;
        if (raw_data.flatMap(r => r.data.map(s => s.t)).length > 0) {
            const dates = ArrayUtil.getUniqueElements(DateUtil.getEqualSpacedSeries(raw_data.flatMap(r => r.data.map(s => s.t)), true));

            const beginDate = dates[0]

            const beginOffset = beginDate.getFullYear() * 12 + beginDate.getMonth();

            const monthOffsetSeries = raw_data.map(rd => rd.data.map(function (d) {
                return {
                    t: d.t.getFullYear() * 12 + d.t.getMonth() - beginOffset,
                    y: d.y
                }
            }).sort(function (a, b) {
                return a.t - b.t
            }))

            const monthOffsets = ArrayUtil.getUniqueElements(monthOffsetSeries.flatMap(s => s.map(r => r.t)).sort((a, b) => a - b));

            const shouldShow = dates.length > 1 && this.props.data.length > 0 && monthOffsets.length > 0

            this.raw_data = raw_data
            this.dates = dates
            this.beginDate = beginDate
            this.beginOffset = beginOffset
            this.monthOffsetSeries = monthOffsetSeries
            this.monthOffsets = monthOffsets
            this.shouldShow = shouldShow
        }
        else {
            this.shouldShow = false
        }
    }


    componentDidMount() {
        window.addEventListener('resize', this.create_chart)
        this.create_chart()
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.create_chart)
    }

    create_chart = () => {

        if (this.shouldShow) {
            select('#' + this.props.id).selectAll("*").remove()

            const dateformat = require('dateformat')

            const plotMargins = {
                top: 30,
                bottom: 50,
                left: 30,
                right: 150
            }
            let svg = select('#' + this.props.id)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .style('overflow', 'visible')

            const width = svg.node()?.getBoundingClientRect().width || 0;
            const height = svg.node()?.getBoundingClientRect().height || 0;

            let plotGroup = svg.append('g')
                .classed('plot', true)
                .attr('transform', `translate(${plotMargins.left},${plotMargins.top})`);


            let plotWidth = width - plotMargins.left - plotMargins.right;
            let plotHeight = height - plotMargins.top - plotMargins.bottom;

            let xScale = scaleLinear()
                .range([0, plotWidth]);

            let yScale = scaleLinear()
                .range([plotHeight, 0]);

            const extentT = [
                this.monthOffsets[0],
                this.monthOffsets[this.monthOffsets.length - 1]
            ];

            xScale.domain(extentT).nice();
            const beginDate = this.beginDate

            plotGroup.append('g')
                .attr('transform', 'translate(0, ' + (plotHeight) + ')')
                .call(
                    axisBottom(xScale)
                        .tickValues(range(0, this.monthOffsets[this.monthOffsets.length - 1] + 1, 1))
                        .tickFormat(function (d, i) {
                            const date =
                                new Date(Math.floor(d / 12) + beginDate.getFullYear() + Math.floor((d % 12 + beginDate.getMonth()) / 12),
                                    ((d % 12 + beginDate.getMonth())) % 12
                                );
                            return dateformat(date, "mmm 'yy")
                        })
                )
                .selectAll("text")
                .attr('transform', 'rotate(-45) translate(-24, -8)')

            const tempExtentY = extent(this.monthOffsetSeries.flatMap(d => d), d => d.y)
            const extentY = [0, tempExtentY[1] || 0];

            yScale.domain(extentY).nice();


            plotGroup.append('g').call(axisLeft(yScale).tickValues(range(0, extentY[1] + 1, Math.ceil(extentY[1] / 10))).tickFormat(function (d, i) {
                return d.toFixed(0)
            }))

            const id = this.props.id;
            const legendBox = svg.append('g').attr('class', 'legend-box')

            const legend =
                legendBox.selectAll('.legend').data(this.raw_data).enter().append('g').attr('class', 'legend')
                    .attr('transform', 'translate(0, ' + (plotHeight / 2 - this.raw_data.length / 2 * 20) + ')')

            legend
                .append('rect')
                .attr('x', width - plotMargins.right + 20)
                .attr('y', function (d, i) {
                    return i * 20
                })
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', function (d, i) {
                    return colors[i]
                })

            legend.append('text')
                .attr('x', width - plotMargins.right + 35)
                .attr('y', function (d, i) {
                    return (i * 20) + 10
                })
                .text(function (d) {
                    return d.name
                })

            const beginOffset = this.beginOffset;

            for (let i = 0; i < this.raw_data.length; ++i) {
                const series_raw = this.monthOffsetSeries[i]

                let series = []
                for(let i = 0; i <= this.monthOffsets[this.monthOffsets.length - 1]; ++i) {
                    series = series.concat({
                        t: new Date(this.beginDate.getFullYear(), this.beginDate.getMonth() + i, 1),
                        y: (series_raw.find(function(d) { return d.t === i}) || {y: 0}).y
                    })
                }

                plotGroup.append('path')
                    .datum(series)
                    .attr('fill', 'none')
                    .attr('stroke', colors[i])
                    .attr('stroke-width', 2.5)
                    .attr('d', line()
                        .x(function (d) {
                            return xScale(d.t.getFullYear() * 12 + d.t.getMonth() - beginOffset)
                        })
                        .y(function (d) {
                            return yScale(d.y)
                        })
                    )
            }

            const mouseG = plotGroup.append("g")
                .attr('class', 'mouse-over-effects')
                .attr('id', this.props.id + '-moe')

            mouseG.append('path')
                .attr('class', 'mouse-line')
                .style('stroke', 'black')
                .style('stroke-width', '1px')
                .style('opacity', '0')

            const mousePerLine = mouseG.selectAll('#' + id + '-moe.mouse-per-line')
                .data(this.raw_data)
                .enter()
                .append('g')
                .attr('class', 'mouse-per-line')


            mousePerLine.append('circle')
                .attr('r', 7)
                .style('stroke', function (d, i) {
                    return colors[i];
                })
                .style('fill', 'none')
                .style('stroke-width', '1px')
                .style('opacity', '0')

            mousePerLine.append('rect')
                .style('background-color', 'blue')
                .attr("transform", "translate(10,-10)")
                .style('opacity', '0')
                .style('fill', 'white')

            mousePerLine.append("text")
                .attr("transform", "translate(10,3)")

            const monthOffsets = this.monthOffsets

            const getAdjustedT = function (mouseX) {
                const selectedTime = xScale.invert(mouseX)
                const fap = monthOffsets.filter(function (d) {
                    return (d <= selectedTime)
                }).sort(function (a, b) {
                    return b - a;
                })
                const pointBefore = fap[0]

                const fap2 = monthOffsets.filter(function (d) {
                    return (d >= selectedTime)
                }).sort(function (a, b) {
                    return a - b;
                })
                const pointAfter = fap2[0]

                if (pointBefore === undefined && pointAfter === undefined) {
                    return null
                } else if (pointBefore === undefined) {
                    return pointAfter;
                } else if (pointAfter === undefined) {
                    return pointBefore;
                } else {
                    let loc = pointBefore
                    if (pointAfter - selectedTime < selectedTime - pointBefore) {
                        loc = pointAfter
                    }
                    return loc;
                }
            }

            const raw_data = this.raw_data;
            mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
                .attr('width', plotWidth) // can't catch mouse events on a g element
                .attr('height', plotHeight)
                .attr('fill', 'none')
                .attr('pointer-events', 'all')
                .on('mouseout', function () { // on mouse out hide line, circles and text
                    select('#' + id + '-moe').select(".mouse-line")
                        .style("opacity", "0");
                    selectAll('#' + id + '-moe .mouse-per-line circle')
                        .style("opacity", "0");
                    selectAll('#' + id + '-moe .mouse-per-line text')
                        .style("opacity", "0")
                    selectAll('#' + id + '-moe .mouse-per-line rect')
                        .style("opacity", "0")

                })
                .on('mouseover', function () { // on mouse in show line, circles and text
                    select('#' + id + '-moe').select(".mouse-line")
                        .style("opacity", "1");
                    selectAll('#' + id + '-moe .mouse-per-line circle')
                        .style("opacity", "1");
                    selectAll('#' + id + '-moe .mouse-per-line text')
                        .style("opacity", "1");
                    selectAll('#' + id + '-moe .mouse-per-line rect')
                        .style("opacity", ".6")
                })
                .on('mousemove', function () { // mouse moving over canvas
                    let lmouse = mouse(this);
                    select('#' + id + '-moe').select(".mouse-line")
                        .attr("d", function () {
                            let loc = xScale(getAdjustedT(lmouse[0]))
                            var d = "M" + loc + "," + plotHeight;
                            d += " " + loc + "," + 0;
                            return d;
                        });

                    select('#' + id + '-moe').selectAll(".mouse-per-line")
                        .attr('transform', function (d, i) {
                            let date = getAdjustedT(lmouse[0])
                            const series = raw_data[i]
                            const point = series.data.find(function (d) {
                                const dc = new Date(beginDate.getFullYear(), beginDate.getMonth() + date, 1)
                                return d.t.getFullYear() === dc.getFullYear() && d.t.getMonth() === dc.getMonth()
                            })
                            const yValue = (point === undefined ? 0 : point.y)
                            const y = yScale(yValue)
                            const x = xScale(date)
                            const text = select(this).select('text').text(yValue.toFixed(0))
                            const width = text.node()?.getBoundingClientRect().width || 0;
                            const height = text.node()?.getBoundingClientRect().width || 0;
                            select(this).select('rect').attr('width', width).attr('height', height / 2);
                            return 'translate(' + x + ', ' + y + ')'
                        })

                });
        }
    }

    getGraphHtml = () => {
        if (this.shouldShow) {
            return <div id={this.props.id} className={this.props.className}></div>
        } else {
            return <h3>Chart cannot be produced due to lack of data</h3>
        }

    }

    getDescription = () => {
        if (this.props.hasOwnProperty("description")) {
            return <i>{this.props.description}</i>
        } else {
            return <Fragment></Fragment>
        }
    }

    render() {
        if (this.props.title !== undefined) {
            return <div>
                <h2>{this.props.title}</h2>
                {this.getDescription()}
                {this.getGraphHtml()}
            </div>
        } else {
            return this.getGraphHtml()
        }
    }
}