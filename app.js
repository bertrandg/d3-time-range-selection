//@ts-check

const sizes = {
    WIDTH: 0,
    HEIGHT: 0,

    border: {
        v1: 2,
        v2: 25,
        v3: 25,
        h1: 30,
        h2: 30,
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
var gPathAll, gPathSelection;
var pathAll, pathSelection, pathHandles, rectZoom, gBrush;
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
            .curve(d3.curveStep);
    }

    curveAll.x(d => xAll(d[0]))
        .y0(sizes.all.height)
        .y1(d => yAll(d[1]));
    
    if(!curveSelection) {
        curveSelection = d3.area()
            .curve(d3.curveStep);
    }

    curveSelection.x(d => xSelection(d[0]))
        .y0(sizes.selection.height)
        .y1(d => ySelection(d[1]));
        
    // BRUSH
    
    if(!brush) {
        brush = d3.brushX()
            .on('start brush end', brushmoved);
    }
        
    brush.extent([[0, 0], [sizes.all.width, sizes.all.height]]);
    
    // ZOOM
    
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

    // ALL

    if(!clipAll) {
        clipAll = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clipAll')
            .append('rect');
    }
        
    if(!gAll) {
        gAll = svg.append('g')
            .attr('class', 'elAll');
    }
    
    if(!gPathAll) {
        gPathAll = gAll.append('g');
    }
    if(!gAxisAllX) {
        gAxisAllX = gAll.append('g')
            .attr('class', 'axis axis--x');
    }
    if(!gBrush) {
        gBrush = gAll.append('g')
            .attr('class', 'brush');
    }
    gBrush.call(brush);

    if(!pathHandles) {
        pathHandles = gBrush.selectAll('.handle--custom')
            .data([{type: 'w'}, {type: 'e'}])
            .enter().append('path')
            .attr('class', 'handle--custom')
            .attr('fill', '#000000')
            .attr('fill-opacity', 0.9)
            .attr('cursor', 'ew-resize');
    }

    // SELECTION
    
    if(!clipSelection) {
        clipSelection = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clipSelection')
            .append('rect');
    }
    
    if(!gSelection) {
        gSelection = svg.append('g')
            .attr('class', 'elSelection');
    }

    if(!gPathSelection) {
        gPathSelection = gSelection.append('g');
    }
    if(!gAxisSelectionX) {
        gAxisSelectionX = gSelection.append('g')
            .attr('class', 'axis axis--x');
    }
    if(!gAxisSelectionY) {
        gAxisSelectionY = gSelection.append('g')
            .attr('class', 'axis axis--y');
    }

    //

    if(!rectZoom) {
        rectZoom = svg.append('rect')
            .attr('class', 'zoom');
    }

    // UPDATE SIZES

    svg.attr('width', sizes.WIDTH).attr('height', sizes.HEIGHT);
    clipAll.attr('width', sizes.all.width).attr('height', sizes.all.height);
    clipSelection.attr('width', sizes.selection.width).attr('height', sizes.selection.height);
        
    gAll.attr('transform', 'translate(' + sizes.all.left + ',' + sizes.all.top + ')');
    gSelection.attr('transform', 'translate(' + sizes.selection.left + ',' + sizes.selection.top + ')');

    gAxisAllX.attr('transform', 'translate(0,' + sizes.all.height + ')');
    gAxisSelectionX.attr('transform', 'translate(0,' + sizes.selection.height + ')');

    pathHandles.attr('d', function rightRoundedRect(d, i) {
        const width = 25;
        const height = sizes.all.height/4;
        const radius = 8;
        const x = (i === 0) ? -width : 0;
        const y = sizes.all.height/8;

        return rounded_rect(x, y, width, height, radius, i === 0, i === 1, i === 0, i === 1);
    });

    dataLoaded(false, _data);

    if(lastSelectionDomain) {
        d3.event = {
            selection: [xAll(lastSelectionDomain[0]), xAll(lastSelectionDomain[1])],
            sourceEvent: null,
            type: 'end'
        }

        brushmoved();
    }
}

function rounded_rect(x, y, w, h, r, tl, tr, bl, br) {
    var retval = "M" + (x + r) + "," + y;
    retval += "h" + (w - 2*r);
    if (tr) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + r; }
    else { retval += "h" + r; retval += "v" + r; }
    retval += "v" + (h - 2*r);
    if (br) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + r; }
    else { retval += "v" + r; retval += "h" + -r; }
    retval += "h" + (2*r - w);
    if (bl) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r; }
    else { retval += "h" + -r; retval += "v" + -r; }
    retval += "v" + (2*r - h);
    if (tl) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + -r; }
    else { retval += "v" + -r; retval += "h" + r; }
    retval += "z";
    return retval;
}


function dataLoaded(error, d) {
    if(error) throw error;
    
    _data = d;

    xAll.domain(d3.extent(_data, d => d[0]));
    yAll.domain([0, d3.max(_data, d => d[1])]);

    xSelection.domain(xAll.domain());
    ySelection.domain(yAll.domain());

    // GRAPH ALL

    if(!pathAll) {
        pathAll = gPathAll.append('path')
            .attr('class', 'pathAll');
    }

    pathAll.datum(_data)
        .attr('d', curveAll);

    gAxisAllX.call(xAxisAll); 

    gBrush/*.call(brush)*/
        .call(brush.move, xAll.range());

    // GRAPH SELECTION

    if(!pathSelection) {
        pathSelection = gPathSelection.append('path')
            .attr('class', 'pathSelection');
    }

    pathSelection.datum(_data)
        .attr('d', curveSelection);

    gAxisSelectionX.call(xAxisSelection);
    gAxisSelectionY.call(yAxisSelection);

    // ZOOM ZONE

    rectZoom.attr('width', sizes.selection.width)
        .attr('height', sizes.selection.height)
        .attr('transform', 'translate(' + sizes.selection.left + ',' + sizes.selection.top + ')')
        .call(zoom);
}


function brushmoved() {
    if(d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
    
    var s = d3.event.selection || xAll.range();
    xSelection.domain(s.map(xAll.invert, xAll));
    
    if(d3.event.sourceEvent instanceof MouseEvent) {
        lastSelectionDomain = xSelection.domain();
    }
    
    // Render graph SELECTION
    gSelection.select('.pathSelection').attr('d', curveSelection);
    gAxisSelectionX.call(xAxisSelection);
    
console.group('BRUSHMOVED');
console.log('('+d3.event.type+') s = ', s);
console.log('SCALE sizes.selection.width / (s[1] - s[0]) = ', sizes.selection.width / (s[1] - s[0]));
console.log('TRANSLATE -s[0], 0 =  ', -s[0], 0); 
console.groupEnd(); 


    // Render selected zone on graph ALL
    
    // graph width = 400
    // s = [100, 300]
    // scale = 400 / (300 - 100) = 2
    // translate = -100, 0

    svg.select('.zoom').call(
        zoom.transform, 
        d3.zoomIdentity
            .scale(sizes.selection.width / (s[1] - s[0])) // 
            .translate(-s[0], 0)
    );


    updateHandlePosition(s);
 console.log('s ', s);
}


function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return; // ignore zoom-by-brush
 
    var t = d3.event.transform;

    // Avoid bug 'no selection' and handles at top left
    if(Math.abs(t.k) === Infinity || Math.abs(t.x) === Infinity || isNaN(t.y)) {
        return;
    }

const dd = xAll.domain();
const dd2 = t.rescaleX(xAll).domain();
console.group('ZOOMED');
console.log('('+d3.event.type+') t = ', t);
console.log(d3.event);
console.log('xAll.domain() = ', dateHour(dd[0]), ' > ', dateHour(dd[1]));
console.log('t.rescaleX(xAll).domain() = ', dateHour(dd2[0]), ' > ', dateHour(dd2[1]));
console.groupEnd(); 
    
    xSelection.domain(t.rescaleX(xAll).domain());
    
    if(d3.event.sourceEvent instanceof MouseEvent) {
        lastSelectionDomain = xSelection.domain();
    }

    gSelection.select('.pathSelection').attr('d', curveSelection);
    gAxisSelectionX.call(xAxisSelection);
    
    gAll.select('.brush').call(brush.move, xSelection.range().map(t.invertX, t));

    updateHandlePosition(xSelection.range().map(t.invertX, t));
}

function updateHandlePosition(s) {
    if(s == null) {
        pathHandles.attr('display', 'none');
    } 
    else {
        pathHandles.attr('display', null).attr('transform', (d, i) => `translate(${ s[i] }, ${ sizes.all.height / 4 })`);
    }
}







function dateHour(d) {
    return d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
}





function stringToDate(v) {
    const year = Number(v.substr(0, 4));
    const month = Number(v.substr(4, 2)) - 1; 
    const day = Number(v.substr(6, 2));
    const hours = Number(v.substr(8, 2));
    const minutes = Number(v.substr(10, 2));
    const seconds = Number(v.substr(12, 2));

    return new Date(year, month, day, hours, minutes, seconds);
}




window.onload = function() {
    function resizeHandler() {
        // resize(460, 400);
        resize(window.innerWidth, window.innerHeight);
    };
    
    window.onresize = resizeHandler;
    resizeHandler();

    d3.json('data.json', function(error, d) {
        // Aggregate nb points per seconds

        let lastTimestampInserted = null;

        const uniqActivities = d.point.reduce((acc, i) => {    
            const currTimestamp = stringToDate(i.date).getTime();

            // Check time diff from previous second setted
            // If more than 2 seconds diff:
            // > add a point to zero one second after previous.
            // > add a point to zero one second before current. 
            if(lastTimestampInserted && currTimestamp - lastTimestampInserted > 2000) {
                acc.set(lastTimestampInserted + 1000, 0);
                acc.set(currTimestamp - 1000, 0);
            }
            else if(!lastTimestampInserted) {
                // Add a zero at start
                acc.set(currTimestamp - 1000, 0);
            }

            acc.set(currTimestamp, (acc.has(currTimestamp) ? acc.get(currTimestamp) + 1 : 1));

            lastTimestampInserted = currTimestamp;
            
            return acc;
        }, new Map());
        
        // Add a zero at end
        uniqActivities.set(lastTimestampInserted + 1000, 0);
        
        dataLoaded(false, Array.from(uniqActivities));
    });
};

