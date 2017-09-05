import React, { Component } from 'react';
import { Segment, Container, Statistic, Progress, Divider, Grid, Label } from 'semantic-ui-react';

const phases = {
    monitor: {
        start: 3
    },
    accelerate: {
        start: 8
    },
    search: {
        start: 18
    },
    link: {
        start: 30
    },
    connected: {
        start: 48
    }
};

phases.monitor.next = phases.accelerate;
phases.accelerate.next = phases.search;
phases.search.next = phases.link;
phases.link.next = phases.connected;

const maxMassU = 3.0;
const minMassU = 2.9;
const maxMassD = 2.7;
const minMassD = 2.6;
const maxMassS = 1.8;
const minMassS = 1.7;
const maxMassC = 1.6;
const minMassC = 1.5;
const maxMassB = 1.0;
const minMassB = 0.9;
const maxMassT = 0.6;
const minMassT = 0.5;

function velocity(t, m) {
    return t/(m*Math.sqrt(1+(t*t)/(m*m)));
}

const schedules = {
    strength: {
        phase: phases.link,
        values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
        threshold: 75,
        deviation: () => (100 - getCurrentValue(schedules.stability))/10,
        min: .01,
        max: 99.99
    },
    bandwidth: {
        phase: phases.link,
        values: [10, 20, 30, 40, 50, 55, 60, 65, 70],
        threshold: 65,
        deviation: () => (100 - getCurrentValue(schedules.stability))/5,
        min: .01,
        max: 79.99
    },
    shift: {
        phase: phases.link,
        values: [0],
        deviation: () => getCurrentValue(schedules.shiftDeviation),
        min: -120,
        max: 120
    },
    shiftDeviation: {
        phase: phases.link,
        values: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 80, 80, 50, 70, 40, 20, 10, 5, 4, 3],
        deviation: () => 0,
        min: .01,
        max: 99.99
    },
    stability: {
        phase: phases.link,
        values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98],
        threshold: 85,
        deviation: () => 5,
        min: .01,
        max: 99.99
    },
    compression: {
        phase: phases.link,
        values: [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 60, 60, 60, 40, 40, 20, 20, 20, 15],
        deviation: () => (100 - getCurrentValue(schedules.stability))/5,
        min: .01,
        max: 99.99
    },
    vDeviation: {
        phase: phases.monitor,
        values: [0.1, 0.1, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02],
        deviation: () => 0,
        min: 0,
        max: 1
    },
    vUMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassU),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vUMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassU),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vDMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassD),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vDMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassD),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vSMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassS),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vSMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassS),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vCMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassC),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vCMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassC),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vBMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassB),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vBMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassB),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vTMin: {
        phase: phases.accelerate,
        values: time => velocity(time, minMassT),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    },
    vTMax: {
        phase: phases.accelerate,
        values: time => velocity(time, maxMassT),
        threshold: .95,
        deviation: () => getCurrentValue(schedules.vDeviation),
        min: .000,
        max: .999
    }
};

let start = null;
let audioCtx = audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let frequency = null;
let noiseLevel = null;
let ringModulatorCarrierLevel = null;
let nonRingModulatorLevel = null;
let signalGain = null;
let analyserNode = null;


function getElapsedTime() {
    if (!start) {
        return 0.0
    }
    return (new Date() - start)/1000.0;
}

function isBefore(phase) {
    return getElapsedTime() < phase.start;
}

function isAfter(phase) {
    return getElapsedTime() >= phase.next.start;
}

function isDuring(phase) {
    return !(isBefore(phase) || isAfter(phase));
}

function getCurrentValue(schedule) {
    let currentTime = getElapsedTime();
    if (isBefore(phases.monitor)) {
        return 0.0;
    }
    if (isBefore(schedule.phase)) {
        return gaussian(0, schedule);
    }
    currentTime -= schedule.phase.start;
    let values = schedule.values;
    if (typeof values === 'function') {
        return gaussian(values(currentTime), schedule);
    }
    if (currentTime > values.length - 1) {
        return gaussian(values[values.length - 1], schedule);
    }
    /*global Smooth*/
    const f = Smooth(values);
    return gaussian(f(currentTime),schedule);
}

function gaussian(mean, schedule) {
    const deviation = schedule.deviation();
    const min = schedule.min;
    const max = schedule.max;
    if (!start) {
        return 0.0;
    }
    if (!deviation) {
        return mean;
    }
    if (isBefore(phases.monitor)) {
        return 0.0;
    }
    let u1 = Math.random();
    let u2 = Math.random();
    let z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
    if (isBefore(schedule.phase)) {
        return Math.min(Math.max(z/10,min),max);
    }
    return Math.min(Math.max(mean + deviation*z,min),max);
}

class Log {
    constructor(size) {
        this.entries = [];
        this.size = size;
    }

    register(cb) {
        this.cb = cb;
    }

    log(severity, entry) {
        if (this.entries.length === this.size) {
            this.entries.shift();
        }
        this.entries.push(severity + ' - ' + entry);
        if (this.cb) {
            this.cb(this.entries);
        }
    }

    info(entry) {
        this.log('INFO', entry)
    }

    warn(entry) {
        this.log('WARN', entry)
    }

    getEntries() {
        return this.entries;
    }
}

let log = new Log(7);

class ElapsedTime extends Component {
    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        this.setState({time: getElapsedTime()});
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        let time = '-:--';
        if (this.state) {
            const seconds = Math.floor(this.state.time)%60;
            const minutes = Math.floor(this.state.time/60);
            time = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
        return (
            <h1>{time}</h1>
        )
    }
}

class Clock extends Component {
    constructor(props) {
        super(props);
        this.state = {
            date: null
        };
    }
    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (!isBefore(phases.monitor)) {
            this.setState({date: new Date()});
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        let currentDate = '-------------------------------';
        let contactDate = '-------------------------------';
        if (this.state.date) {
            currentDate = this.state.date.toISOString();
        }
        if (!isBefore(phases.search)) {
            let futureDate = new Date(this.state.date);
            futureDate.setFullYear(futureDate.getFullYear()+3);
            let deltaSeconds = (futureDate-this.state.date)/1000;
            let t = getElapsedTime() - phases.search.start;
            let deltaSecondsNow = deltaSeconds*(1.0-1.0/Math.pow(1.01,Math.pow(t,3)));
            let currentFutureDate = new Date(this.state.date.getTime() + deltaSecondsNow*1000);
            contactDate = currentFutureDate.toISOString();
        }
        return (
            <Segment textAlign="center" inverted>
                <Statistic size="teensy" inverted horizontal>
                    <Statistic.Label>T<sub>current</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{currentDate}</Statistic.Value>
                </Statistic>
                <Divider fitted hidden/>
                <Statistic size="teensy" inverted horizontal>
                    <Statistic.Label>T<sub>contact</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{contactDate}</Statistic.Value>
                </Statistic>
            </Segment>

        )
    }
}

class LocalChat extends Component {
    componentDidMount() {
        navigator.mediaDevices.getUserMedia({audio:true, video:true}).then((stream) => {
            var video = document.getElementById('gum-local');
            video.srcObject = stream;
            this.stream = stream;
        });
    }

    componentWillUnmount() {
        this.stream.getAudioTracks()[0].stop();
        this.stream.getVideoTracks()[0].stop();
    }
    render() {
        return(
            <div className="video-container">
                <video id="gum-local" width="475"></video>
            </div>
        );
    }
}

class Metric extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 0.0,
            minValue: 0.0,
            maxValue: 0.0
        };
    }
    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (this.props.schedule) {
            this.setState({value: getCurrentValue(this.props.schedule)});
        }
        else if (this.props.minSchedule && this.props.maxSchedule) {
            this.setState({minValue: getCurrentValue(this.props.minSchedule), maxValue: getCurrentValue(this.props.maxSchedule)});
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    renderMetric(value, schedule, nullString) {
        let result = {};
        result.value = nullString;
        if (!isBefore(phases.monitor)) {
            result.value = value.toFixed(3);
        }
        result.state = 'metric-off';
        if (schedule.threshold && value > schedule.threshold) {
            result.state = 'metric-on';
        }
        else if (!schedule.threshold && !isBefore(schedule.phase)) {
            result.state = 'metric-on';
        }
        else if (isAfter(schedule.phase) && schedule.threshold && value < schedule.threshold) {
            result.state = 'metric-warn';
            //log.warn(this.props.title + ' has fallen below acceptable threshold');
        }
        else if (isDuring(schedule.phase)) {
            result.state = 'metric-starting';
        }
        return result;
    }

    render() {
        if (this.props.schedule) {
            const metric = this.renderMetric(this.state.value, this.props.schedule, '-.----')
            return (
                <Grid.Row>
                    <Grid.Column textAlign="left">
                        {this.props.title}
                    </Grid.Column>
                    <Grid.Column textAlign="right" className={metric.state}>
                        {metric.value}
                    </Grid.Column>
                </Grid.Row>
            );
        }
        else if (this.props.minSchedule && this.props.maxSchedule) {
            const minMetric = this.renderMetric(this.state.minValue, this.props.minSchedule, '-.--')
            const maxMetric = this.renderMetric(this.state.maxValue, this.props.maxSchedule, '-.--')
            return (
                <Grid.Row>
                    <Grid.Column textAlign="left">
                        {this.props.title}
                    </Grid.Column>
                    <Grid.Column textAlign="right" className={minMetric.state}>
                        {minMetric.value}
                    </Grid.Column>
                    <Grid.Column textAlign="right" className={maxMetric.state}>
                        {maxMetric.value}
                    </Grid.Column>
                </Grid.Row>
            );
        }
    }
}

class RemoteChat extends Component {

    componentDidMount() {
        var myThis = this;
        var video = document.getElementById("gum-remote");
        var id = this.props.id;
        var myNumber = id + (this.props.caller ? '-caller' : '-callee');
        console.log(`my number is ${myNumber}!`);
        /*global PHONE*/
        var phone = PHONE({
            number        : myNumber,
            publish_key   : 'pub-c-9ba2da8a-c8d5-4511-a953-f342e79621ca',
            subscribe_key : 'sub-c-bbbda54a-cb83-11e6-8164-0619f8945a4f',
            media         : { audio : true, video : true },
            ssl: true
        });
        phone.receive(function(session){
            console.log("I'm getting a call!");
            console.log(session);
            console.log(video);
            session.connected(function(session) {
                console.log(session);
                session.video.width = 475;
                if (myThis.props.caller) {
                    session.video.className = "noisey";
                    session.video.style.webkitFilter = 'opacity(0%)';
                }
                myThis.video = session.video;
                video.appendChild(session.video);
                console.log(session.pc.getRemoteStreams());
                if (myThis.props.caller) {
                    // not supported!
                    //var constantSourceNode = AudioContext.createConstantSource();
                    analyserNode = audioCtx.createAnalyser();
                    analyserNode.fftSize = 256;
                    analyserNode.connect(audioCtx.destination);
                    let sourceNode = audioCtx.createMediaStreamSource(session.pc.getRemoteStreams()[0]);
                    let ringModulatorGainNode = audioCtx.createGain();
                    let nonRingModulatorGainNode = audioCtx.createGain();
                    let ringModulatorCarrier = audioCtx.createOscillator();
                    ringModulatorCarrier.frequency.value = 50;
                    let ringModulatorCarrierGain = audioCtx.createGain();
                    ringModulatorCarrierLevel = ringModulatorCarrierGain.gain;
                    nonRingModulatorLevel = nonRingModulatorGainNode.gain;
                    ringModulatorCarrier.connect(ringModulatorCarrierGain);
                    ringModulatorCarrierGain.connect(ringModulatorGainNode.gain);
                    ringModulatorCarrier.start();
                    sourceNode.connect(ringModulatorGainNode);
                    sourceNode.connect(nonRingModulatorGainNode);
                    let biquadFilter = audioCtx.createBiquadFilter();
                    frequency = biquadFilter.frequency
                    biquadFilter.type = "lowpass";
                    biquadFilter.frequency.value = 0;
                    ringModulatorGainNode.connect(biquadFilter);
                    nonRingModulatorGainNode.connect(biquadFilter);
                    let signalGainNode = audioCtx.createGain();
                    signalGain = signalGainNode.gain;
                    biquadFilter.connect(signalGainNode);
                    signalGainNode.connect(analyserNode);

                    const channels = 2;
                    const frameCount = audioCtx.sampleRate * 2.0;
                    const noiseBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);
                    for (var channel = 0; channel < channels; channel++) {
                        var nowBuffering = noiseBuffer.getChannelData(channel);
                        for (var i = 0; i < frameCount; i++) {
                            nowBuffering[i] = Math.random() * 2 - 1;
                        }
                    }
                    var noiseNode = audioCtx.createBufferSource();
                    noiseNode.loop = true;
                    noiseNode.buffer = noiseBuffer;
                    let noiseFilter = audioCtx.createBiquadFilter();
                    noiseFilter.type = "lowpass";
                    noiseFilter.frequency.value = 5000;
                    let noiseGain = audioCtx.createGain();
                    noiseLevel = noiseGain.gain;
                    noiseGain.gain.value = 0;
                    noiseFilter.gain.value = 0;
                    noiseNode.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(analyserNode);
                    noiseNode.start();
                }

            });
            session.ended(function(session) {
                video.innerHTML='';
            });
        });
        if (this.props.caller) {
            phone.ready(() => {
                let number = id + '-callee';
                console.log(`I'm making a call to ${number}!`);
                phone.dial(number);
            });
        }
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (!this.video) {
            return;
        }
        if (this.props.caller) {
            const opacity = getCurrentValue(schedules.strength);
            const blur = 5 - getCurrentValue(schedules.bandwidth)/15;
            const greyscale = 100 - getCurrentValue(schedules.bandwidth)/2;
            const hueRotate = getCurrentValue(schedules.shift);
            const contrast = 10 * getCurrentValue(schedules.compression);
            this.video.style.WebkitFilter = `opacity(${opacity}%) contrast(${contrast}%) hue-rotate(${hueRotate}deg) grayscale(${greyscale}%) blur(${blur}px)`;
            if (frequency) {
                frequency.value = getCurrentValue(schedules.bandwidth) * 20;
            }
            if (noiseLevel) {
                noiseLevel.value = (100 - getCurrentValue(schedules.strength))/250;
            }
            if (ringModulatorCarrierLevel) {
                ringModulatorCarrierLevel.value = getCurrentValue(schedules.shift)*getCurrentValue(schedules.shift)/500;
            }
            if (nonRingModulatorLevel) {
                nonRingModulatorLevel.value = (100 - getCurrentValue(schedules.shiftDeviation))/30;
            }
            if (signalGain) {
                signalGain.value = getCurrentValue(schedules.strength)/250;
            }
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <div className="video-container noisey" id="gum-remote"></div>

        );
    }
}

class Radar extends Component {
    componentDidMount() {
        let ctx = document.getElementById('radar');
        this.dataPoints = [0,0,0,0];
        let dataConfig = {
            labels: ["Stbl", "Str", "Bw", "Hdr"],
            datasets: [
                {
                    backgroundColor: "rgba(179,181,198,0.2)",
                    borderColor: "rgba(179,181,198,1)",
                    pointBackgroundColor: "rgba(179,181,198,1)",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "rgba(179,181,198,1)",
                    fill: true,
                    data: this.dataPoints
                },
            ]
        };
        /*global Chart*/
        Chart.defaults.global.title.display = false;
        this.graph = new Chart(ctx, {
            type: 'radar',
            data: dataConfig,
            options: {
                tooltips: {
                    enabled: false
                },
                legend: {display: false},
                scale: {
                    ticks: {display:false, min:0, max:100},
                    scaleLabel: {display: false}
                }
            }
        });

        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        this.dataPoints[0] = getCurrentValue(schedules.stability);
        this.dataPoints[1] = getCurrentValue(schedules.strength);
        this.dataPoints[2] = getCurrentValue(schedules.bandwidth);
        let compression = getCurrentValue(schedules.compression);
        this.dataPoints[3] = isBefore(phases.link) ? 0 : 100 - compression;
        this.graph.update();
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <Segment inverted>
                <Label attached='top'><p>Temporal Link</p></Label>
                <Divider hidden section/>
                <canvas id="radar"></canvas>
            </Segment>
        );
    }
}

class AccelerationGraph extends Component {
    componentDidMount() {
        let ctx = document.getElementById('accelerationGraph');
        this.data = [0,0,0,0,0,0];
        this.colors = ["#000", "#000", "#000", "#000", "#000", "#000"]
        let dataConfig = {
            datasets: [
                {
                    backgroundColor: this.colors,
                    borderColor: [
                        "#000",
                        "#000",
                        "#000",
                        "#000",
                        "#000",
                        "#000",
                    ],
                    data: this.data
                },
            ]
        };
        this.graph = new Chart(ctx, {
            type: 'polarArea',
            data: dataConfig,
            options: {
                tooltips: {
                    enabled: false
                },
                legend: {display: false},
                scale: {
                    ticks: {display:false, min:0, max:1},
                    scaleLabel: {display: false}
                }
            }
        });

        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    updateBubble(i, minSchedule, maxSchedule) {
        this.data[i] = getCurrentValue(maxSchedule);
        if (isAfter(maxSchedule.phase) && this.data[i] < maxSchedule.threshold) {
            this.colors[i] = 'yellow'
        }
        else if (isBefore(maxSchedule.phase)) {
            this.colors[i] = 'grey'
        }
        else {
            this.colors[i] = 'white'
        }
    }

    tick() {
        this.updateBubble(0, schedules.vTMin, schedules.vTMax);
        this.updateBubble(1, schedules.vBMin, schedules.vBMax);
        this.updateBubble(2, schedules.vCMin, schedules.vCMax);
        this.updateBubble(3, schedules.vSMin, schedules.vSMax);
        this.updateBubble(4, schedules.vDMin, schedules.vDMax);
        this.updateBubble(5, schedules.vUMin, schedules.vUMax);
        this.graph.update();
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <Segment inverted>
                <Label attached='top'><p>Accelerator</p></Label>
                <Divider hidden section/>
                <canvas id="accelerationGraph"></canvas>
            </Segment>
        );
    }}

class AudioHistogram extends Component {
    componentDidMount() {
        let ctx = document.getElementById('audioHistogram');
        this.data = new Array(128);
        let dataConfig = {
            labels: new Array(32),
            datasets: [
                {
                    backgroundColor: "#fff",
                    borderColor: "#fff",
                    data: this.data
                },
            ]
        };
        this.graph = new Chart(ctx, {
            type: 'bar',
            data: dataConfig,
            options: {
                tooltips: {
                    enabled: false
                },
                legend: {display: false},
                scales: {
                    xAxes: [{
                        display: false
                    }],
                    yAxes: [{
                        display: false,
                        min: 0,
                        max: 100
                    }]
                }
            }
        });

        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (analyserNode) {
            let rawData = new Float32Array(128);
            analyserNode.getFloatFrequencyData(rawData);
            rawData.forEach((value, i) => {
                value = (value + 80)/(40);
                value = value*value*100;
                value = Math.min(Math.max(value,0),100);
                this.data[i] = value;
            });
            this.graph.update();
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <Segment inverted>
                <Label attached='top'><p>Spectral Analysis</p></Label>
                <Divider hidden section/>
                <canvas id="audioHistogram"></canvas>
            </Segment>
        );
    }
}

class Console extends Component {
    constructor(props) {
        super(props);
        this.state = {
            entries: []
        }
        this.props.log.register(this.updateEntries);
    }

    updateEntries = (entries) => {
        this.setState({entries: entries});
    }

    render() {
        const entries = this.state.entries.map(entry => <p>{entry}</p>)
        return (
            <Segment inverted>
                <Label attached='top'><p>Log</p></Label>
                <Divider hidden section/>
                {entries}
            </Segment>
        );
    }
}

class Phase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            state: "off"
        };
    }

    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            101
        );
    }

    tick() {
        if (isAfter(this.props.phase)) {
            if (this.state.state === 'starting') {
                //log.info(this.props.name + ' phase completed');
            }
            this.setState({state: "on"});
            clearInterval(this.timerID);
        }
        else if (!isBefore(this.props.phase)) {
            if (this.state.state === 'off') {
                //log.info('starting ' + this.props.name + ' phase');
            }
            this.setState({state: "starting"});
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return (
            <Grid.Column width={2} textAlign="center" className={this.state.state}>{this.props.name}&nbsp;{this.state.state === 'off' ? 'OFF' : 'ON'}</Grid.Column>
        )
    }

}

class Present extends Component {
    componentDidMount() {
        start = new Date();
    }

    render() {
        return (
            <Container>
                <Grid celled>
                    <Grid.Column width={3}>
                        <Radar updateInterval={167}/>
                    </Grid.Column>
                    <Grid.Column width={3}>
                        <AccelerationGraph updateInterval={251}/>
                    </Grid.Column>
                    <Grid.Column width={5}>
                        <AudioHistogram updateInterval={211}/>
                    </Grid.Column>
                    <Grid.Column width={5}>
                        <Console log={log}/>
                    </Grid.Column>
                    <Grid.Column width={2}>
                        <Segment inverted>
                            <Divider inverted horizontal>Acc V<sub>min</sub>/V<sub>max</sub></Divider>
                            <Grid columns="three">
                                <Metric minSchedule={schedules.vUMin} maxSchedule={schedules.vUMax} title="Vu" updateInterval={223}/>
                                <Metric minSchedule={schedules.vDMin} maxSchedule={schedules.vDMax} title="Vd" updateInterval={227}/>
                                <Metric minSchedule={schedules.vSMin} maxSchedule={schedules.vSMax} title="Vs" updateInterval={229}/>
                                <Metric minSchedule={schedules.vCMin} maxSchedule={schedules.vCMax} title="Vc" updateInterval={233}/>
                                <Metric minSchedule={schedules.vBMin} maxSchedule={schedules.vBMax} title="Vb" updateInterval={239}/>
                                <Metric minSchedule={schedules.vTMin} maxSchedule={schedules.vTMax} title="Vt" updateInterval={241}/>

                            </Grid>
                            <Divider inverted horizontal>Q<sub>link</sub></Divider>
                            <Grid columns="two">
                                <Metric schedule={schedules.strength} title="Str" updateInterval={199}/>
                                <Metric schedule={schedules.bandwidth} title="Bw" updateInterval={197}/>
                                <Metric schedule={schedules.shift} title="Shift" updateInterval={193}/>
                                <Metric schedule={schedules.compression} title="Cmp" updateInterval={191}/>
                                <Metric schedule={schedules.stability} title="Stbl" updateInterval={181}/>
                            </Grid>
                        </Segment>
                    </Grid.Column>
                    <Grid.Column width={14} className="tight-sides">
                        <Segment inverted>
                            <LocalChat/>
                            <RemoteChat caller id={this.props.id} updateInterval={101}/>
                        </Segment>
                    </Grid.Column>
                    <Grid.Column width={2}>
                        <ElapsedTime updateInterval={173}/>
                    </Grid.Column>
                    <Grid.Column width={6}>
                        <Clock updateInterval={179}/>
                    </Grid.Column>
                    <Phase name="Monitors" phase={phases.monitor}/>
                    <Phase name="Accelerator" phase={phases.accelerate}/>
                    <Phase name="Search" phase={phases.search}/>
                    <Phase name="Link" phase={phases.link}/>
                </Grid>
            </Container>
        );
    }
}

class Future extends Component {
    render() {
        return (
            <Container>
                <LocalChat/>
                <RemoteChat callee id={this.props.id} updateInterval={101}/>
            </Container>
        );
    }
}

class App extends Component {
    render() {
        console.log(window.location.search);
        if (window.location.search.includes('future')){
            return (
                <Future id="his-wife-athol"/>
            );
        }
        else {
            return (
                <Present id="his-wife-athol"/>
            );
        }
    }
}

export default App;
