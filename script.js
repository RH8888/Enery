// script.js

// =====================================
// CANVAS
// =====================================

const canvas =
    document.getElementById("simCanvas");

const ctx =
    canvas.getContext("2d");

function resizeCanvas() {

    canvas.width =
        canvas.clientWidth;

    canvas.height =
        canvas.clientHeight;

}

window.addEventListener(
    "resize",
    resizeCanvas
);

resizeCanvas();



// =====================================
// STATE
// =====================================

const state = {

    running: true,

    gravity: 9.81,

    friction: 0.02,

    mass: 5,

    springK: 120,

    timeScale: 1,

    ballRadius: 16

};



// =====================================
// BALL
// =====================================

const ball = {

    t: 0.10,

    velocity: 12

};



// =====================================
// SPRING
// =====================================

const spring = {

    startT: 0.88,

    compression: 0,

    maxCompression: 0,

    compressionScale: 8,

    visualSize: 90

};



// =====================================
// CONTROLS
// =====================================

const velocitySlider =
    document.getElementById("velocity");

const positionSlider =
    document.getElementById("position");

const gravitySlider =
    document.getElementById("gravity");

const frictionSlider =
    document.getElementById("friction");

const massSlider =
    document.getElementById("mass");

const springSlider =
    document.getElementById("spring");

const timeScaleSlider =
    document.getElementById("timeScale");

const h1Slider =
    document.getElementById("h1");

const h2Slider =
    document.getElementById("h2");

const h3Slider =
    document.getElementById("h3");

const springStartSlider =
    document.getElementById("springStart");

const compressionScaleSlider =
    document.getElementById("compressionScale");

const springVisualSlider =
    document.getElementById("springVisual");



// =====================================
// HEIGHTS
// =====================================

let h1 = 2.0;

let h2 = 0.5;

let h3 = 2.5;



// =====================================
// LABELS
// =====================================

function updateLabels() {

    document.getElementById(
        "velocityLabel"
    ).textContent =
        velocitySlider.value + " m/s";

    document.getElementById(
        "positionLabel"
    ).textContent =
        positionSlider.value + "%";

    document.getElementById(
        "gravityLabel"
    ).textContent =
        gravitySlider.value;

    document.getElementById(
        "frictionLabel"
    ).textContent =
        frictionSlider.value;

    document.getElementById(
        "massLabel"
    ).textContent =
        massSlider.value + " kg";

    document.getElementById(
        "springLabel"
    ).textContent =
        springSlider.value + " N/m";

    document.getElementById(
        "timeScaleLabel"
    ).textContent =
        timeScaleSlider.value + "x";

    document.getElementById(
        "h1Label"
    ).textContent =
        h1Slider.value + " m";

    document.getElementById(
        "h2Label"
    ).textContent =
        h2Slider.value + " m";

    document.getElementById(
        "h3Label"
    ).textContent =
        h3Slider.value + " m";

    document.getElementById(
        "springStartLabel"
    ).textContent =
        springStartSlider.value + "%";

    document.getElementById(
        "compressionScaleLabel"
    ).textContent =
        compressionScaleSlider.value + "x";

    document.getElementById(
        "springVisualLabel"
    ).textContent =
        springVisualSlider.value + " px";

}

updateLabels();



// =====================================
// SLIDER EVENTS
// =====================================

[
    velocitySlider,
    positionSlider,
    gravitySlider,
    frictionSlider,
    massSlider,
    springSlider,
    timeScaleSlider,
    h1Slider,
    h2Slider,
    h3Slider,
    springStartSlider,
    compressionScaleSlider,
    springVisualSlider

].forEach(slider => {

    slider.addEventListener(
        "input",
        () => {

            updateLabels();

            syncState();

        }
    );

});



// =====================================
// SYNC
// =====================================

function syncState() {

    state.gravity =
        parseFloat(
            gravitySlider.value
        );

    state.friction =
        parseFloat(
            frictionSlider.value
        );

    state.mass =
        parseFloat(
            massSlider.value
        );

    state.springK =
        parseFloat(
            springSlider.value
        );

    state.timeScale =
        parseFloat(
            timeScaleSlider.value
        );

    h1 =
        parseFloat(
            h1Slider.value
        );

    h2 =
        parseFloat(
            h2Slider.value
        );

    h3 =
        parseFloat(
            h3Slider.value
        );

    spring.startT =
        parseFloat(
            springStartSlider.value
        ) / 100;

    spring.compressionScale =
        parseFloat(
            compressionScaleSlider.value
        );

    spring.visualSize =
        parseFloat(
            springVisualSlider.value
        );

}

syncState();



// =====================================
// BUTTONS
// =====================================

document.getElementById(
    "playBtn"
).onclick = () => {

    state.running = true;

};

document.getElementById(
    "pauseBtn"
).onclick = () => {

    state.running = false;

};

document.getElementById(
    "resetBtn"
).onclick = resetBall;



// =====================================
// RESET
// =====================================

function resetBall() {

    ball.t =
        parseFloat(
            positionSlider.value
        ) / 100;

    ball.velocity =
        parseFloat(
            velocitySlider.value
        );

    spring.maxCompression = 0;

}

resetBall();



// =====================================
// UTILS
// =====================================

function smoothstep(t) {

    return t * t * (
        3 - 2 * t
    );

}

function lerp(a, b, t) {

    return a + (
        b - a
    ) * t;

}

function metersToY(m) {

    return (
        canvas.height
        - 120
        - m * 120
    );

}



// =====================================
// TERRAIN
// =====================================

function terrain(t) {

    const x =
        t * canvas.width;

    let y;

    if (t < 0.18) {

        y =
            metersToY(h1);

    }

    else if (t < 0.42) {

        const local =
            (t - 0.18)
            /
            (0.42 - 0.18);

        y = lerp(

            metersToY(h1),

            metersToY(h2),

            smoothstep(local)

        );

    }

    else if (t < 0.58) {

        y =
            metersToY(h2);

    }

    else if (t < 0.82) {

        const local =
            (t - 0.58)
            /
            (0.82 - 0.58);

        y = lerp(

            metersToY(h2),

            metersToY(h3),

            smoothstep(local)

        );

    }

    else {

        y =
            metersToY(h3);

    }

    return { x, y };

}



// =====================================
// SLOPE
// =====================================

function terrainSlope(t) {

    const eps =
        0.0001;

    const p1 =
        terrain(
            Math.max(
                0,
                t - eps
            )
        );

    const p2 =
        terrain(
            Math.min(
                1,
                t + eps
            )
        );

    return (

        (p2.y - p1.y)

        /

        (p2.x - p1.x)

    );

}



// =====================================
// PHYSICS
// =====================================

function updatePhysics(dt) {

    if (!state.running)
        return;

    const slope =
        terrainSlope(ball.t);

    const gravityForce =
        state.gravity
        * slope
        * 0.9;

    const frictionForce =
        -state.friction
        * ball.velocity;

    let acceleration =
        gravityForce
        + frictionForce;

    spring.compression = 0;

    if (ball.t > spring.startT) {

        spring.compression =
            (ball.t - spring.startT);

        spring.maxCompression =
            Math.max(
                spring.maxCompression,
                spring.compression
            );

        const compressionMeters =
            spring.compression
            *
            spring.compressionScale;

        const springForce =
            -state.springK
            *
            compressionMeters;

        acceleration +=
            springForce
            /
            state.mass;

    }

    ball.velocity +=
        acceleration
        * dt
        * state.timeScale;

    ball.t +=
        ball.velocity
        * 0.06
        * dt
        * state.timeScale;

    if (ball.t < 0) {

        ball.t = 0;

        ball.velocity *= -0.25;

    }

    if (ball.t > 0.985) {

        ball.t = 0.985;

        if (ball.velocity > 0) {

            ball.velocity *= -0.4;

        }

    }

}



// =====================================
// ENERGY
// =====================================

let maxEnergySeen = 1;

function updateEnergy() {

    const p =
        terrain(ball.t);

    const realHeightMeters =
        (
            canvas.height
            - p.y
            - 120
        )
        / 120;

    const PE =
        state.mass
        *
        state.gravity
        *
        realHeightMeters;

    const KE =
        0.5
        *
        state.mass
        *
        ball.velocity
        *
        ball.velocity;

    const compressionMeters =
        spring.compression
        *
        spring.compressionScale;

    const EE =
        0.5
        *
        state.springK
        *
        compressionMeters
        *
        compressionMeters;

    const ME =
        PE + KE + EE;

    maxEnergySeen =
        Math.max(
            maxEnergySeen,
            ME
        );

    updateBar(
        "peBar",
        "peValue",
        PE
    );

    updateBar(
        "keBar",
        "keValue",
        KE
    );

    updateBar(
        "eeBar",
        "eeValue",
        EE
    );

    updateBar(
        "meBar",
        "meValue",
        ME
    );

}

function updateBar(
    barId,
    valueId,
    value
) {

    const percent =
        (value / maxEnergySeen)
        * 100;

    document.getElementById(
        barId
    ).style.width =
        percent + "%";

    document.getElementById(
        valueId
    ).textContent =
        value.toFixed(1)
        + " J";

}



// =====================================
// TERRAIN DRAW
// =====================================

function drawTerrain() {

    ctx.beginPath();

    for (
        let i = 0;
        i <= 500;
        i++
    ) {

        const t =
            i / 500;

        const p =
            terrain(t);

        if (i === 0)
            ctx.moveTo(
                p.x,
                p.y
            );

        else
            ctx.lineTo(
                p.x,
                p.y
            );

    }

    ctx.lineTo(
        canvas.width,
        canvas.height
    );

    ctx.lineTo(
        0,
        canvas.height
    );

    ctx.closePath();

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#cbd5e1"
    );

    gradient.addColorStop(
        1,
        "#94a3b8"
    );

    ctx.fillStyle =
        gradient;

    ctx.fill();

    ctx.strokeStyle =
        "#475467";

    ctx.lineWidth = 5;

    ctx.stroke();

}



// =====================================
// SPRING DRAW
// =====================================

function drawSpring() {

    const p =
        terrain(spring.startT);

    const wallX =
        canvas.width - 45;

    const compressionPixels =
        spring.compression
        *
        spring.visualSize
        *
        10;

    const springLength =
        Math.max(
            40,
            wallX
            - p.x
            - compressionPixels
        );

    const startX =
        p.x + 10;

    const centerY =
        p.y;

    const coils = 14;

    const amplitude =
        Math.max(
            4,
            15
            - spring.compression
            * 40
        );

    ctx.beginPath();

    for (
        let i = 0;
        i <= coils * 20;
        i++
    ) {

        const t =
            i / (coils * 20);

        const x =
            startX
            + t * springLength;

        const y =
            centerY
            +
            Math.sin(
                t
                * Math.PI
                * coils
                * 2
            )
            * amplitude;

        if (i === 0)
            ctx.moveTo(x, y);

        else
            ctx.lineTo(x, y);

    }

    ctx.strokeStyle =
        "#d1d5db";

    ctx.lineWidth = 6;

    ctx.stroke();

    ctx.fillStyle =
        "#475467";

    ctx.fillRect(
        wallX,
        centerY - 58,
        16,
        116
    );

}



// =====================================
// BALL
// =====================================

function drawBall(x, y) {

    ctx.beginPath();

    ctx.arc(

        x + 10,

        y + 14,

        state.ballRadius,

        0,

        Math.PI * 2

    );

    ctx.fillStyle =
        "rgba(0,0,0,0.16)";

    ctx.fill();

    const gradient =

        ctx.createRadialGradient(

            x - 5,

            y - 8,

            5,

            x,

            y,

            28

        );

    gradient.addColorStop(
        0,
        "#ffffff"
    );

    gradient.addColorStop(
        1,
        "#ef4444"
    );

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        state.ballRadius,

        0,

        Math.PI * 2

    );

    ctx.fillStyle =
        gradient;

    ctx.fill();

}



// =====================================
// LOOP
// =====================================

let last =
    performance.now();

function animate(now) {

    const dt =
        (now - last)
        / 1000;

    last = now;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    updatePhysics(dt);

    drawTerrain();

    drawSpring();

    const p =
        terrain(ball.t);

    drawBall(
        p.x,
        p.y - 18
    );

    updateEnergy();

    requestAnimationFrame(
        animate
    );

}

requestAnimationFrame(
    animate
);