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
        this.numberOfBeans = 3

        this.debug = true;
    }

    init (data)
    {

    }

    preload ()
    {
        this.load.image('match3_tiles', 'assets/tiles/match3.png')
        this.load.spritesheet('match3Sprite', 'assets/tiles/match3.png', { frameWidth: TILE_WIDTH, frameHeight: TILE_HEIGHT });

        this.load.tilemapTiledJSON('tilemap', 'assets/tiles/level2.json')
    }

    create ()
    {
        const map = this.make.tilemap({ key: 'tilemap' })
        const tileset = map.addTilesetImage('tt_match3', 'match3_tiles')

        const mapLayer = map.createLayer('map', tileset)
        const genLayer = map.createLayer('generator', tileset)
        const beanLayer = map.createLayer('beans', tileset)


        this.gameBoard = new Object()
        this.generators = new Object()
        this.beans = new Object()

        mapLayer.forEachTile(value => {
            if (value.index != -1 && value.properties.isGameBoard) { 
                this.gameBoard[[value.x * TILE_WIDTH + TILE_WIDTH / 2, value.y * TILE_HEIGHT + TILE_HEIGHT / 2]] = 0;
            }
        }, this);

        beanLayer.forEachTile(value => {
            if (value.index != -1) { 
                let pos = [value.x * TILE_WIDTH + TILE_WIDTH/2, value.y * TILE_HEIGHT + TILE_HEIGHT/2]
                this.beans[pos] = this.createBean(pos[0], pos[1], value.index - 1)
            }
        }, this);
        beanLayer.destroy()

        genLayer.forEachTile(value => {
            if (value.index != -1 && value.properties.isGenerator) { 
                this.generators[[value.x * TILE_WIDTH, value.y * TILE_HEIGHT]] = 0;
            }
        }, this);

        if (this.debug) {
            let p = this.add.text(0, 0, '0/0').setColor("0xFFFFFF").setOrigin(0);

            this.input.on('gameobjectmove', function (pointer, gameObject) {
                p.text = gameObject.x + "/" + gameObject.y
        
            });
        } 

        this.moveBeans()
    }

    createRandomBean(x, y) {
        let spriteIndex = this.getRandomInt(0, this.numberOfBeans - 1);
        return this.createBean(x, y, spriteIndex)
    }


    createBean(x, y, spriteIndex) {
        let bean = this.physics.add.sprite(x, y, 'match3Sprite', spriteIndex)
        return this.updateBean(bean, x, y, spriteIndex)
    }
        
    updateBean(bean, x, y, spriteIndex) {
        bean.setInteractive()
        bean.setOrigin(0.5);


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

        let tween = this.tweens.add({
            targets: [bean1, bean2],
            ease: 'Power',
            duration: this.updateTime,
            x: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.originX;
            },
            y: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.originY;
            },
            repeat: 0,
            yoyo: false
        }, this);
        tween.on('complete', function () { this.moveBeans() }, this);
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
            let pos = [genPos[0] + TILE_WIDTH / 2, genPos[1] + TILE_HEIGHT + TILE_HEIGHT / 2];
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

        this.generateBeans()

        while (changes) {
            changes = false

            let prio1 = []
            let prio2 = []
            let prio3 = []

            for (const key of Object.keys(this.gameBoard)) {

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
            if(changes) {
                somethingMoved = true;
                continue; 
            }

            changes = this.moveTiles(prio3, changes, TILE_WIDTH, TILE_HEIGHT)
            if(changes) {
                somethingMoved = true;
            }
        }

        let tween = this.tweens.add({
            targets: Object.values(this.beans),
            ease: 'Power',
            duration: this.updateTime,
            x: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.originX;
            },
            y: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.originY;
            },
            repeat: 0,
            yoyo: false
        }, this);

        tween.on('complete', function () { 
            if (somethingMoved) {this.moveBeans()}
            else {this.matchBeans()}
        }, this);

        return somethingMoved
    };

    moveTiles(beans, changes, deltaX, deltaY) {
        beans.forEach(value => {
            if (this.beans[value[1]] != null && this.beans[value[1]].isMoved == false) {
                changes = true
                this.beans[value[0]] = this.beans[value[1]]
                delete this.beans[value[1]]
                this.beans[value[0]].isMoved = true
                this.beans[value[0]].originX = this.beans[value[0]].x + deltaX;
                this.beans[value[0]].originY = this.beans[value[0]].y + deltaY;
            }
        }, this);
        return changes
    }

    compareArraysForCommonItem(arr1, arr2) {
        return arr1.some(item => arr2.includes(item))
    }

    getCommonItem(arr1, arr2) {
        let tmp = null;
        arr1.forEach(item => {
            if (arr2.includes(item)) {
                tmp = item
            }
        })
        return tmp
    }

    concatArraysByCommonValue(arr1, arr2) {
        let commonValueArrays = {}

        arr1.forEach(subArr1 => {         
            arr2.forEach(subArr2 => {
                const hasCommonItem = this.compareArraysForCommonItem(subArr1, subArr2)

                if (hasCommonItem) {
                    let commonItem = this.getCommonItem(subArr1, subArr2)
                    commonValueArrays[commonItem] = subArr1.concat(subArr2)
                }
            })
        }, this);
        return commonValueArrays
    }

    matchBombs(bombs) {
        // get the spriteindex of the bean that becomes a bomb
        let spriteIndexByPos = {}
        for (const key of Object.keys(bombs)) {
            spriteIndexByPos[key] = this.beans[key].spriteIndex
        }

        // create temp beans that are only there to animate them in the tweens event
        let tempBombs = []
        for (const [key, arr] of Object.entries(bombs)) {
            arr.forEach(value => {
                let beanPos = this.getPosFromKey(value)
                let tempBomb = this.createBean(beanPos[0], beanPos[1], this.beans[beanPos].spriteIndex)
                
                let targetPos = this.getPosFromKey(key)
                tempBomb.targetX = targetPos[0]
                tempBomb.targetY = targetPos[1]

                tempBombs.push(tempBomb)
            })
        }

        // delete all the beans involved
        for (const [key, arr] of Object.entries(bombs)) {
            arr.forEach(value => {
                if (value in this.beans){
                    this.beans[value].destroy()
                    delete this.beans[value]
                }
            })
        }

        // create the new bombs
        for (const key of Object.keys(bombs)) {
            let pos = this.getPosFromKey(key)
            this.beans[pos] = this.createBean(pos[0], pos[1], spriteIndexByPos[key] + 20)
        }
        return tempBombs
    }

    match5OrHigher(horizontals, verticals) {
        // get every match 5 or higher
        let match5 = []
        horizontals.concat(verticals).forEach(value => {
            if (value.length >= 5) {
                match5.push(value)
            }
        })

        // get the spriteindex of the bean that becomes a match 5
        let spriteIndexByPos = {}
        match5.forEach(value => {
            let pos = value[Math.floor(value.length / 2)]
            spriteIndexByPos[pos] = this.beans[pos].spriteIndex
        })

        // create temp beans that are only there to animate them in the tweens event
        let tempMatch5 = []
        match5.forEach(arr => {
            let targetPos = this.getPosFromKey(arr[Math.floor(arr.length / 2)])
            
            arr.forEach(value => {
                let beanPos = this.getPosFromKey(value)
                let temp = this.createBean(beanPos[0], beanPos[1], this.beans[beanPos].spriteIndex)

                temp.targetX = targetPos[0]
                temp.targetY = targetPos[1]

                tempMatch5.push(temp)
            })
        })

        // delete all the beans involved
        match5.forEach(arr => {
            arr.forEach(value => {
                if (value in this.beans){
                    this.beans[value].destroy()
                    delete this.beans[value]
                }
            })
        })

        // create the new match 5
        for (const key of Object.keys(spriteIndexByPos)) {
            let pos = this.getPosFromKey(key)
            this.beans[pos] = this.createBean(pos[0], pos[1], 9)
        }

        return tempMatch5
    }

    animateMatch(match) {
        let tween = this.tweens.add({
            targets: match,
            ease: 'Power',
            duration: this.updateTime,
            x: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.targetX;
            },
            y: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                return target.targetY;
            },
            repeat: 0,
            yoyo: false
        }, this);

        tween.on('complete', function (obj) { 
            let somethingMatched = false;
            tween.targets.forEach(value => {
                value.destroy()
                somethingMatched = true
            })
            if (!somethingMatched) {this.candrag = true}
            else {this.matchBeans()}
            
        }, this);
    }

    matchBeans() {
        let [matchedVerticalBeans, horizontals] = this.getHorizontalMatches();
        let [matchedHorizontalBeans, verticals, crosses] = this.getVerticalMatches(matchedVerticalBeans)

        // PRIO 1 Match 5+
        let match5 = this.match5OrHigher(horizontals, verticals)
        if (match5.length > 0) {
            this.animateMatch(match5)
            return true
        }

        // PRIO 2 Bombs
        let bombs = this.concatArraysByCommonValue(crosses, horizontals)
        bombs = this.matchBombs(bombs)
        if (bombs.length > 0) {
            this.animateMatch(bombs)
            return true
        }

        this.moveBeans()
        return false
        // TODO: candrag must be set at any point
        // if (!somethingMatched) {this.candrag = true}

        // return somethingMatched
    }

    getHorizontalMatches() {
        let matchedBeans = new Set();

        let horizontals = [];

        for (const [key, value] of Object.entries(this.beans)) {
            let pos = this.getPosFromKey(key);
            if (matchedBeans.has(String(pos))) {
                continue;
            }

            let i = 1;
            let tempPos = [];

            while (true) {
                let nextHorPos = [pos[0] + (i * TILE_WIDTH), pos[1]];

                // check if this tile exists if not break 
                if (this.dictGet(this.beans, nextHorPos, null) == null) { break; }
                // if it's not the same tile break
                if (this.dictGet(this.beans, nextHorPos, null).spriteIndex != value.spriteIndex) {
                    break;
                }
                tempPos.push(String(nextHorPos));
                i++;
            }

            if (i >= 3) {
                matchedBeans.add(String(pos));

                tempPos.forEach(value => {
                    matchedBeans.add(value);
                });

                horizontals.push([String(pos)].concat(tempPos));
            }
        }
        return [matchedBeans, horizontals];
    }

    getVerticalMatches(horizontalMatches) {
        let matchedBeans = new Set();

        let verticals = [];
        let crosses = []

        for (const [key, value] of Object.entries(this.beans)) {
            let pos = this.getPosFromKey(key);
            if (matchedBeans.has(String(pos))) {
                continue;
            }

            let i = 1;
            let tempPos = [];
            let isCrossed = horizontalMatches.has(String(pos));

            while (true) {
                let nextVerPos = [pos[0], pos[1] + (i * TILE_HEIGHT)];

                // check if this tile exists if not break 
                if (this.dictGet(this.beans, nextVerPos, null) == null) { break; }
                // if it's not the same tile break
                if (this.dictGet(this.beans, nextVerPos, null).spriteIndex != value.spriteIndex) {
                    break;
                }

                if (horizontalMatches.has(String(nextVerPos))) {
                    isCrossed = true;
                }

                tempPos.push(String(nextVerPos));
                i++;
            }

            if (i >= 3) {
                matchedBeans.add(String(pos));

                tempPos.forEach(value => {
                    matchedBeans.add(value);
                });

                if (isCrossed) {crosses.push([String(pos)].concat(tempPos))}
                verticals.push([String(pos)].concat(tempPos));
            }
        }
        return [matchedBeans, verticals, crosses];
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

    }
}

