//@ts-check

const sizes = {
    WIDTH: 0,
    HEIGHT: 0,

    border: {
        v1: 2,
        v2: 25,
        v3: 25,
        h1: 25,
        h2: 2,
    },
    
    all: {
        top: 0,  
        left: 0,
        width: 0,
        height: 0,
    },
    
    selection: {
        top: 0, 
        left: 0,
        width: 0,
        height: 0, 
    },
}


var xAll, yAll, xSelection, ySelection;
var xAxisAll, xAxisSelection, yAxisSelection;
var curveAll, curveSelection;
var brush, zoom;
var svg = d3.select('svg');
var clipAll, clipSelection;
var gAll, gSelection;
var pathAll, pathSelection, rectZoom, gBrush;
var gAxisAllX, gAxisSelectionX, gAxisSelectionY;
var _data = [];
var lastSelectionDomain = null;



function resize(W, H) {
    sizes.WIDTH =   W;
    sizes.HEIGHT =  H;

    sizes.all.top =             sizes.border.v1; 
    sizes.all.left =            sizes.border.h1;
    sizes.all.width =           sizes.WIDTH - sizes.border.h1 - sizes.border.h2;
    sizes.all.height =          Math.round((sizes.HEIGHT - sizes.border.v1 - sizes.border.v2 - sizes.border.v3)/2);
    
    sizes.selection.top =       sizes.all.top + sizes.all.height + sizes.border.v2;
    sizes.selection.left =      sizes.border.h1;
    sizes.selection.width =     sizes.WIDTH - sizes.border.h1 - sizes.border.h2;
    sizes.selection.height =    sizes.HEIGHT - sizes.all.top - sizes.all.height - sizes.border.v2 - sizes.border.v3; 
    
    // SCALES

    xAll =          d3.scaleTime().range([0, sizes.all.width]),
    yAll =          d3.scaleLinear().range([sizes.all.height, 0]),
    xSelection =    d3.scaleTime().range([0, sizes.selection.width]),
    ySelection =    d3.scaleLinear().range([sizes.selection.height, 0]);
    
    // AXIS

    xAxisAll =          d3.axisBottom(xAll),
    xAxisSelection =    d3.axisBottom(xSelection),
    yAxisSelection =    d3.axisLeft(ySelection);
    
    // CURVES
    
    if(!curveAll) {
        curveAll = d3.area()
            .curve(d3.curveMonotoneX);
    }

    curveAll.x(d => xAll(d['date']))
        .y0(sizes.all.height)
        .y1(d => yAll(d['price']));
    
    if(!curveSelection) {
        curveSelection = d3.area()
            .curve(d3.curveMonotoneX);
    }

    curveSelection.x(d => xSelection(d['date']))
        .y0(sizes.selection.height)
        .y1(d => ySelection(d['price']));
        
    // EXTRAS
    
    if(!brush) {
        brush = d3.brushX()
            .on('brush end', brushed);
    }
        
    brush.extent([[0, 0], [sizes.all.width, sizes.all.height]]);
    
    if(!zoom) {
        zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .on('zoom', zoomed);
    }
    zoom.translateExtent([[0, 0], [sizes.selection.width, sizes.selection.height]])
        .extent([[0, 0], [sizes.selection.width, sizes.selection.height]]);
        
    
    build();
}


function build() {
    if(!clipAll) {
        clipAll = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clipAll')
            .append('rect');
    }
    
    if(!clipSelection) {
        clipSelection = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clipSelection')
            .append('rect');
    }
        
    if(!gAll) {
        gAll = svg.append('g')
            .attr('class', 'elAll');
    }
    
    if(!gSelection) {
        gSelection = svg.append('g')
            .attr('class', 'elSelection');
    }

    // UPDATE SIZES

    svg
        .attr('width', sizes.WIDTH)
        .attr('height', sizes.HEIGHT);
    
    clipAll
        .attr('width', sizes.all.width)
        .attr('height', sizes.all.height);
    
    clipSelection
        .attr('width', sizes.selection.width)
        .attr('height', sizes.selection.height);
        
    gAll.attr('transform', 'translate(' + sizes.all.left + ',' + sizes.all.top + ')');
    gSelection.attr('transform', 'translate(' + sizes.selection.left + ',' + sizes.selection.top + ')');

    dataLoaded(false, _data);

    if(lastSelectionDomain) {
        d3.event = {
            selection: [xAll(lastSelectionDomain[0]), xAll(lastSelectionDomain[1])],
            sourceEvent: null,
            type: 'end'
        }

        brushed();
    }
}



function dataLoaded(error, d) {
    if(error) throw error;
    
    _data = d;

    xAll.domain(d3.extent(_data, d => d.date));
    yAll.domain([0, d3.max(_data, d => d.price)]);

    xSelection.domain(xAll.domain());
    ySelection.domain(yAll.domain());

    // GRAPH ALL

    if(!pathAll) {
        pathAll = gAll.append('path')
            .attr('class', 'curveAll');
    }

    pathAll.datum(_data)
        .attr('d', curveAll);

    if(!gAxisAllX) {
        gAxisAllX = gAll.append('g')
            .attr('class', 'axis axis--x');
    }

    gAxisAllX.attr('transform', 'translate(0,' + sizes.all.height + ')')
        .call(xAxisAll);
        
    if(!gBrush) {
        gBrush = gAll.append('g')
            .attr('class', 'brush');
    }

    gBrush.call(brush)
        .call(brush.move, xAll.range());

    // GRAPH SELECTION

    if(!pathSelection) {
        pathSelection = gSelection.append('path')
            .attr('class', 'curveSelection');
    }

    pathSelection.datum(_data)
        .attr('d', curveSelection);

    if(!gAxisSelectionX) {
        gAxisSelectionX = gSelection.append('g')
            .attr('class', 'axis axis--x');
    }

    gAxisSelectionX.attr('transform', 'translate(0,' + sizes.selection.height + ')')
        .call(xAxisSelection);
    
    if(!gAxisSelectionY) {
        gAxisSelectionY = gSelection.append('g')
            .attr('class', 'axis axis--y');
    }
    
    gAxisSelectionY.call(yAxisSelection);

    // ZOOM ZONE

    if(!rectZoom) {
        rectZoom = svg.append('rect')
            .attr('class', 'zoom');
    }

    rectZoom.attr('width', sizes.selection.width)
        .attr('height', sizes.selection.height)
        .attr('transform', 'translate(' + sizes.selection.left + ',' + sizes.selection.top + ')')
        .call(zoom);
}


function brushed() {
    if(d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
    
    var s = d3.event.selection || xAll.range();
    xSelection.domain(s.map(xAll.invert, xAll));

    if(d3.event.sourceEvent instanceof MouseEvent) {
        lastSelectionDomain = xSelection.domain();
    }
    
    // Render graph SELECTION
    gSelection.select('.curveSelection').attr('d', curveSelection);
    gSelection.select('.axis--x').call(xAxisSelection);
    
    // Render selected zone on graph ALL
    svg.select('.selection').call(zoom.transform, d3.zoomIdentity
        .scale(sizes.selection.width / (s[1] - s[0]))
        .translate(-s[0], 0));
}

function renderBrushed() {
    
}

function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return; // ignore zoom-by-brush
 
    var t = d3.event.transform;
    xSelection.domain(t.rescaleX(xAll).domain());
    
    if(d3.event.sourceEvent instanceof MouseEvent) {
        lastSelectionDomain = xSelection.domain();
    }

    gSelection.select('.curveSelection').attr('d', curveSelection);
    gSelection.select('.axis--x').call(xAxisSelection);
    
    gAll.select('.brush').call(brush.move, xSelection.range().map(t.invertX, t));
}


function type(d) {
    const parseDate = d3.timeParse('%b %Y');
    
    d.date = parseDate(d.date);
    d.price = +d.price;
    
    return d;
}

function stringToDate(v) {
    // arrive like this: 20170130162910
    // OR                20170130162910343
    const year = Number(v.substr(0, 4));
    const month = Number(v.substr(4, 2)) - 1; 
    const day = Number(v.substr(6, 2));
    const hours = Number(v.substr(8, 2));
    const minutes = Number(v.substr(10, 2));
    const seconds = Number(v.substr(12, 2));
    const ms = (v.length > 14) ? Number(v.substr(14)) : 0;

    return new Date(year, month, day, hours, minutes, seconds, ms);
}




window.onload = function() {
    function resizeHandler() {
        resize(window.innerWidth, window.innerHeight);
    };
    
    window.onresize = resizeHandler;
    resizeHandler();

    d3.csv('sp500.csv', type, dataLoaded);

    d3.json('data.json', function(error, d) {
        const uniqActivities = d.point.reduce((acc, i) => acc.set(i.date, (acc.has(i.date) ? acc.get(i.date) + 1 : 1)), new Map());
        

    });
};

