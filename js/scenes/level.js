const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;


class Level extends Phaser.Scene
{
    constructor (key)
    {
        super({ "key": key });

        this.timer = null;
        this.updateTime = 120
        this.candrag = false;

        // 0 - Moving State
        // 1 - Match State
        this.state = 0

    }

    init (data)
    {

    }

    preload ()
    {
        this.load.image('match3_tiles', 'assets/tiles/match3.png')
        this.load.spritesheet('match3Sprite', 'assets/tiles/match3.png', { frameWidth: TILE_WIDTH, frameHeight: TILE_HEIGHT });

        this.load.tilemapTiledJSON('tilemap', 'assets/tiles/level1.json')
    }

    create ()
    {
        const map = this.make.tilemap({ key: 'tilemap' })
        const tileset = map.addTilesetImage('match3', 'match3_tiles')

        const mapLayer = map.createLayer('map', tileset)
        const genLayer = map.createLayer('generator', tileset)


        this.gameBoard = new Object()
        this.generators = new Object()
        this.beans = new Object()

        mapLayer.forEachTile(value => {
            if (value.index != -1 && value.properties.isGameBoard) { 
                this.gameBoard[[value.x * TILE_WIDTH, value.y * TILE_HEIGHT]] = 0;
            }
        }, this);

        genLayer.forEachTile(value => {
            if (value.index != -1 && value.properties.isGenerator) { 
                this.generators[[value.x * TILE_WIDTH, value.y * TILE_HEIGHT]] = 0;
            }
        }, this);

    }

    createRandomBean(x, y) {
        let spriteIndex = this.getRandomInt(3, 8);
        return this.createBean(x, y, spriteIndex)
    }


    createBean(x, y, spriteIndex) {
        let bean = this.physics.add.sprite(x, y, 'match3Sprite', spriteIndex)
            .setInteractive()
            .setOrigin(0);


        this.input.setDraggable(bean);
        bean.on('drag', function (pointer, dragX, dragY) {
            if (this.candrag == false) {return;}
            
            bean.x = dragX;
            bean.y = dragY;
            
            if (bean.originX - TILE_WIDTH/2 > bean.x) {
                this.swapBeans(bean.originX, bean.originY, bean.originX - TILE_WIDTH, bean.originY)
                this.candrag = false;
            }
            else if (bean.originX + TILE_WIDTH/2 < bean.x) {
                this.swapBeans(bean.originX, bean.originY, bean.originX + TILE_WIDTH, bean.originY)
                this.candrag = false;
            }
            else if (bean.originY - TILE_HEIGHT/2 > bean.y) {
                this.swapBeans(bean.originX, bean.originY, bean.originX, bean.originY - TILE_HEIGHT)
                this.candrag = false;
            }
            else if (bean.originY + TILE_HEIGHT/2 < bean.y) {
                this.swapBeans(bean.originX, bean.originY, bean.originX, bean.originY + TILE_HEIGHT)
                this.candrag = false;
            }
        }, this);

        bean.on('pointerup', function (pointer, dragX, dragY) {
            this.tweens.add({
                targets: bean,
                ease: 'Power',
                duration: 30,
                x: bean.originX,
                y: bean.originY,
                repeat: 0,
                yoyo: false
            }, this);
        }, this);

        bean.isMoved = false;
        bean.spriteIndex = spriteIndex
        bean.originX = x
        bean.originY = y
        return bean
    }

    swapBeans(x1, y1, x2, y2) {
        let bean1 = this.beans[[x1, y1]];
        let bean2 = this.beans[[x2, y2]];

        bean1.originX = x2;
        bean1.originY = y2;
        bean2.originX = x1;
        bean2.originY = y1;

        this.beans[[x1, y1]] = bean2;
        this.beans[[x2, y2]] = bean1;

        // bean1.x = x2;
        // bean1.y = y2;
        // bean2.x = x1;
        // bean2.y = y1;

        this.tweens.add({
            targets: bean1,
            ease: 'Power',
            duration: this.updateTime - 10,
            x: x2,
            y: y2,
            repeat: 0,
            yoyo: false
        }, this);


        let tween = this.tweens.add({
            targets: bean2,
            ease: 'Power',
            duration: this.updateTime - 10,
            x: x1,
            y: y1,
            repeat: 0,
            yoyo: false
        }, this);
        tween.on('complete', function () { this.state = 3 }, this);
    }

    // The maximum is inclusive and the minimum is inclusive
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min); 
    }

    dictGet(object, key, default_value) {
        var result = object[key];
        return (typeof result !== "undefined") ? result : default_value;
    }

    getPosFromKey(key){
        return key.split(",").map(Number);
    }

    generateBeans() {
        for (const [key, value] of Object.entries(this.generators)) {
            let genPos = this.getPosFromKey(key)
            let pos = [genPos[0], genPos[1] + TILE_HEIGHT];
            if (this.dictGet(this.beans, pos, null) == null) {
                this.beans[pos] = this.createRandomBean(pos[0], pos[1])
            }
        }
    }

    moveBeans() {
        let changes = true;
        let somethingMoved = false;

        for (const [key, value] of Object.entries(this.beans)) {
            value.isMoved = false
        }

        while (changes) {
            changes = false

            let prio1 = []
            let prio2 = []
            let prio3 = []

            this.generateBeans()

            for (const [key, value] of Object.entries(this.gameBoard)) {

                let currentPos = this.getPosFromKey(key) 

                let beanPosAbove = [currentPos[0], currentPos[1] - TILE_HEIGHT];
                let beanPosLeft = [currentPos[0] - TILE_WIDTH, currentPos[1] - TILE_HEIGHT];
                let beanPosLeftAbove = [currentPos[0] - TILE_WIDTH, currentPos[1] - 2 * TILE_HEIGHT];
                let beanPosRight = [currentPos[0] + TILE_WIDTH, currentPos[1] - TILE_HEIGHT];
                let beanPosRightAbove = [currentPos[0] + TILE_WIDTH, currentPos[1] - 2 * TILE_HEIGHT];
    
                if (this.dictGet(this.beans, beanPosAbove, null) != null && 
                    this.dictGet(this.beans, currentPos, null) == null && 
                    this.dictGet(this.beans, beanPosAbove, null).isMoved == false) 
                {
                    prio1.push([currentPos, beanPosAbove])
                }

                if (this.dictGet(this.beans, beanPosRight, null) != null && 
                    this.dictGet(this.beans, currentPos, null) == null && 
                    this.dictGet(this.beans, beanPosRight, null).isMoved == false &&
                    this.dictGet(this.beans, beanPosRightAbove, null) == null &&
                    this.dictGet(this.beans, beanPosAbove, null) == null) 
                {
                    prio2.push([currentPos, beanPosRight])
                }

                if (this.dictGet(this.beans, beanPosLeft, null) != null && 
                    this.dictGet(this.beans, currentPos, null) == null && 
                    this.dictGet(this.beans, beanPosLeft, null).isMoved == false &&
                    this.dictGet(this.beans, beanPosLeftAbove, null) == null &&
                    this.dictGet(this.beans, beanPosAbove, null) == null) 
                {
                    prio3.push([currentPos, beanPosLeft])
                }
            }

            changes = this.moveTiles(prio1, changes, 0, TILE_HEIGHT)
            if(changes) {
                somethingMoved = true;
                continue; 
            }

            changes = this.moveTiles(prio2, changes, -TILE_WIDTH, TILE_HEIGHT)
            changes = this.moveTiles(prio3, changes, TILE_WIDTH, TILE_HEIGHT)

            if(changes) {
                somethingMoved = true;
            }
        }

        if (somethingMoved == false) {this.state = 1}

        return somethingMoved
    };

    moveTiles(beans, changes, deltaX, deltaY) {
        beans.forEach(value => {
            if (this.beans[value[1]] != null && this.beans[value[1]].isMoved == false) {
                changes = true
                this.beans[value[0]] = this.beans[value[1]]
                this.beans[value[0]].isMoved = true
                this.beans[value[0]].originX = this.beans[value[0]].x + deltaX;
                this.beans[value[0]].originY = this.beans[value[0]].y + deltaY;

                let tween = this.tweens.add({
                    targets: this.beans[value[0]],
                    ease: 'Power',
                    duration: this.updateTime - 10,
                    x: this.beans[value[0]].x + deltaX,
                    y: this.beans[value[0]].y + deltaY,
                    repeat: 0,
                    yoyo: false
                }, this);
                tween.on('complete', function () { this.state = 0 }, this);

                delete this.beans[value[1]]
            }
        }, this);
        return changes
    }

    matchBeans() {
        let somethingMatched = false;

        let matchedBeans = new Set()
        let horizontal = []
        let vertical = []

        for (const [key, value] of Object.entries(this.beans)) {
            let pos = this.getPosFromKey(key)
            let posR = [pos[0] + TILE_WIDTH, pos[1]]
            let posRR = [pos[0] + 2 * TILE_WIDTH, pos[1]]

            let posD = [pos[0], pos[1] + TILE_HEIGHT]
            let posDD = [pos[0], pos[1] + 2 * TILE_HEIGHT]

            if (this.dictGet(this.beans, posR, null) != null &&
                this.dictGet(this.beans, posRR, null) != null &&
                this.dictGet(this.beans, posR, null).spriteIndex == value.spriteIndex &&
                this.dictGet(this.beans, posRR, null).spriteIndex == value.spriteIndex) 
            {
                horizontal.push([pos, posR, posRR])

                matchedBeans.add(pos.join(","))
                matchedBeans.add(posR.join(","))
                matchedBeans.add(posRR.join(","))
            }

            if (this.dictGet(this.beans, posD, null) != null &&
                this.dictGet(this.beans, posDD, null) != null &&
                this.dictGet(this.beans, posD, null).spriteIndex == value.spriteIndex &&
                this.dictGet(this.beans, posDD, null).spriteIndex == value.spriteIndex) 
            {
                vertical.push([pos, posD, posDD])

                matchedBeans.add(pos.join(","))
                matchedBeans.add(posD.join(","))
                matchedBeans.add(posDD.join(","))
            }
        }

        matchedBeans.forEach(value => {
            this.beans[value].destroy()
            delete this.beans[value]
            somethingMatched = true
        }, this);

        if (somethingMatched == false) {this.state = 2}
        else {this.state = 0}

        return somethingMatched
    }

    setBeansInteractive() {
        for (const [key, value] of Object.entries(this.beans)) {
            value.setInteractive()
        }
    }

    disableBeansInteractive() {
        for (const [key, value] of Object.entries(this.beans)) {
            value.disableInteractive()
        }
    }

    update (time, delta)
    {
        if (this.timer == null || this.timer + this.updateTime < time){
            this.timer = time

            if (this.state == 0){
                this.state = -1;
                this.moveBeans()
            }

            if (this.state == 1){
                this.state = -1;
                this.matchBeans()
            }

            if (this.state == 2){
                this.state = -1;
                this.candrag = true;
            }

            if (this.state == 3) {
                this.state = 0;
            }
        }
    }
}

