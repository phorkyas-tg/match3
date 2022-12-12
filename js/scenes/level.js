const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;


class Level extends Phaser.Scene
{
    constructor (key)
    {
        super({ "key": key });

        
    }

    init (data)
    {
        this.timer = null;
        this.updateTime = 120
        this.animationTime = 500
        this.candrag = false;
        this.numberOfBeans = 6
        this.moves = 3
        this.gameOver = false

        this.collect = {"numberOfCollectibles": 3, 
                        "0": {"spriteIndex": 0, "collected": 0, "collect": 100, "bean": null, "txt": null},
                        "1": {"spriteIndex": 1, "collected": 0, "collect": 120, "bean": null, "txt": null},
                        "2": {"spriteIndex": 2, "collected": 0, "collect": 150, "bean": null, "txt": null}}
    }

    preload ()
    {
        this.load.image('match3_tiles', 'assets/tiles/match3.png')
        this.load.image('bg', 'assets/sprites/headquarter.png')
        this.load.image('hand', 'assets/sprites/hand_touch.png')
        this.load.spritesheet('match3Sprite', 'assets/tiles/match3.png', { frameWidth: TILE_WIDTH, frameHeight: TILE_HEIGHT });

        this.load.tilemapTiledJSON('tilemap', 'assets/tiles/level2.json')
    }

    create ()
    {
        const bg = this.add.image(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, "bg").setScale(5).setAlpha(0.2)
        const map = this.make.tilemap({ key: 'tilemap' })
        const tileset = map.addTilesetImage('match3', 'match3_tiles')

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

        if (beanLayer != null) {
            beanLayer.forEachTile(value => {
                if (value.index != -1) { 
                    let pos = [value.x * TILE_WIDTH + TILE_WIDTH/2, value.y * TILE_HEIGHT + TILE_HEIGHT/2]
                    this.beans[pos] = this.createBean(pos[0], pos[1], value.index - 1)
                }
            }, this);
            beanLayer.destroy()
        }

        genLayer.forEachTile(value => {
            if (value.index != -1 && value.properties.isGenerator) { 
                this.generators[[value.x * TILE_WIDTH, value.y * TILE_HEIGHT]] = 0;
            }
        }, this);

        this.createScore()

        this.moveBeans()
    }

    createScore() {
        let rec = this.add.rectangle(CANVAS_WIDTH/2, 150, CANVAS_WIDTH - 200, CANVAS_HEIGHT / 10, "0xffffff", 0.8)
            .setOrigin(0.5)
            .setStrokeStyle(5, "0x63666a", 0.5)

        let style = { color: "#ffffff", fontSize: "40px", stroke: "#63666a", strokeThickness: 8}

        let movesImg = this.add.image(160, 150, "hand").setOrigin(0.5)
        this.movesText = this.add.text(movesImg.x + 80, movesImg.y, this.moves, style).setOrigin(0.5)

        for (let i=0; i < this.collect.numberOfCollectibles; i++) {
            let bean = this.physics.add.sprite(CANVAS_WIDTH - 270 - i * 180, 150, 'match3Sprite', this.collect[String(i)].spriteIndex).setOrigin(0.5)
            let txt = this.add.text(bean.x + 80, bean.y, this.collect[String(i)].collected, style).setOrigin(0.5)
            this.collect[String(i)].bean = bean
            this.collect[String(i)].txt = txt
        }
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
        // Index of the sprite
        bean.spriteIndex = spriteIndex
        // indicates if two tiles match
        // e.g. an orange bomb and an orange bean have different sprites but they should match
        bean.matchIndex = spriteIndex % 10

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
        
        tween.on('complete', function () { 
            let isMoved = true
            let destroyedBeans = {}
            for (let i=0; i < this.collect.numberOfCollectibles; i++) {
                destroyedBeans[this.collect[String(i)].spriteIndex] = 0
            }

            // both beans are super Poweups
            if (bean1.spriteIndex == 9 && bean2.spriteIndex == 9){
                let newPowerups = []
                let newMatches = []

                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    //  identify powerUp
                    if (this.beans[pos].spriteIndex >= 9) {
                        newPowerups.push(this.createTempBeanFromPos(pos))
                    }

                    if (this.beans[pos].spriteIndex in destroyedBeans) {
                        destroyedBeans[this.beans[pos].spriteIndex]++
                    }
                    
                    this.beans[pos].destroy()
                    delete this.beans[pos]
                }

                let spu1 = this.createBean(bean1.x, bean1.y, bean1.spriteIndex)
                spu1.targetX = bean1.x
                spu1.targetY = bean1.y
                newMatches.push(spu1)
                let spu2 = this.createBean(bean2.x, bean2.y, bean2.spriteIndex)
                spu2.targetX = bean2.x
                spu2.targetY = bean2.y
                newMatches.push(spu2)
                this.cameras.main.shake(500, 0.02);

                this.animateMatchTween(newMatches, newPowerups)
            }
            // one of the two beans are a super PowerUp
            else if (bean1.spriteIndex == 9 || bean2.spriteIndex == 9){
                let newPowerups = []
                let newMatches = []

                let matchIndex = bean1.matchIndex
                let spriteIndex = bean1.spriteIndex
                let superBean = bean2
                if (bean1.spriteIndex == 9) {
                    matchIndex = bean2.matchIndex
                    spriteIndex = bean2.spriteIndex
                    superBean = bean1
                }
                
                // get all beans that match this match index
                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    if (this.beans[pos].matchIndex == matchIndex) {
                        //  identify powerUp
                        if (this.beans[pos].spriteIndex >= 9) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }
                        // handle if the other bean is a bomb or a bug
                        else if (spriteIndex >= 10) {
                            let otherPowerUp = this.createBean(pos[0], pos[1], spriteIndex)
                            otherPowerUp.targetX = superBean.x
                            otherPowerUp.targetY = superBean.y
                            // if its a bug rotate it randomly
                            if (this.isBugSprite(spriteIndex)) {
                                otherPowerUp.setRotation(Math.PI / 2 * this.getRandomInt(0, 1))
                            }
                            newPowerups.push(otherPowerUp)
                        }

                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        
                        this.beans[pos].destroy()
                        delete this.beans[pos]

                    }
                }

                // create super powerUp
                let pos = [superBean.x, superBean.y]
                let spu = this.createBean(superBean.x, superBean.y, superBean.spriteIndex)
                spu.targetX = superBean.x
                spu.targetY = superBean.y
                newMatches.push(spu)

                if (this.beans[pos].spriteIndex in destroyedBeans) {
                    destroyedBeans[this.beans[pos].spriteIndex]++
                }

                this.beans[pos].destroy()
                delete this.beans[pos]

                this.cameras.main.shake(500, 0.01);

                this.animateMatchTween(newMatches, newPowerups)
            }
            // both are bombs
            else if (bean1.spriteIndex >= 20 && bean2.spriteIndex >= 20) {
                // bean 1 will always be dragged to bean 2 and swap places so bean 1 is the center of the explosion
                let newPowerups = []
                let newMatches = []
                
                let pos1 = [bean1.x, bean1.y]
                let pos2 = [bean2.x, bean2.y]

                // first destroy the other bomb
                if (this.beans[pos2].spriteIndex in destroyedBeans) {
                    destroyedBeans[this.beans[pos2].spriteIndex]++
                }
                this.beans[pos2].destroy()
                delete this.beans[pos2]

                const directions = [-2, -1, 0, 1, 2]

                directions.forEach(x => {
                    directions.forEach(y => {
                        if (x != 0 || y != 0) {
                            let pos = [bean1.x + (x * TILE_WIDTH), bean1.y + (y * TILE_HEIGHT)]
                            if (pos in this.beans) {
                                //  identify powerUp
                                if (this.beans[pos].spriteIndex >= 9) {
                                    newPowerups.push(this.createTempBeanFromPos(pos))
                                }
                                if (this.beans[pos].spriteIndex in destroyedBeans) {
                                    destroyedBeans[this.beans[pos].spriteIndex]++
                                }
                                
                                this.beans[pos].destroy()
                                delete this.beans[pos]
                            }
                        }
                    })
                })

                // create temp bomb
                let bomb = this.createBean(bean1.x, bean1.y, bean1.spriteIndex)
                bomb.targetX = bean1.x
                bomb.targetY = bean1.y
                newMatches.push(bomb)

                if (this.beans[pos1].spriteIndex in destroyedBeans) {
                    destroyedBeans[this.beans[pos1].spriteIndex]++
                }

                this.beans[pos1].destroy()
                delete this.beans[pos1]

                this.cameras.main.shake(500, 0.01);

                this.animateMatchTween(newMatches, newPowerups)
            }
            // one is a bug and one is a bomb
            else if ((this.isBugSprite(bean1.spriteIndex) && bean2.spriteIndex >= 20) || (this.isBugSprite(bean2.spriteIndex) && bean1.spriteIndex >= 20)) {
                let newPowerups = []
                let newMatches = []
                
                let pos1 = [bean1.x, bean1.y]
                let pos2 = [bean2.x, bean2.y]

                // first destroy the other bomb
                if (this.beans[pos2].spriteIndex in destroyedBeans) {
                    destroyedBeans[this.beans[pos2].spriteIndex]++
                }
                this.beans[pos2].destroy()
                delete this.beans[pos2]

                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    
                    if (pos[1] == bean1.y || pos[1] == bean1.y + TILE_HEIGHT || pos[1] == bean1.y - TILE_HEIGHT || pos[0] == bean1.x || pos[0] == bean1.x + TILE_WIDTH|| pos[0] == bean1.x - TILE_WIDTH) {
                        //  identify powerUp but not the thing in the middle
                        if (this.beans[pos].spriteIndex >= 9 && String(pos) != String(pos1)) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }
                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        this.beans[pos].destroy()
                        delete this.beans[pos]
                    }
                }

                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y, bean1.spriteIndex, 0, true))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x + TILE_WIDTH, bean1.y, bean1.spriteIndex, 0, true))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x - TILE_WIDTH, bean1.y, bean1.spriteIndex, 0, true))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y, bean1.spriteIndex, Math.PI / 2, false))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y + TILE_HEIGHT, bean1.spriteIndex, Math.PI / 2, false))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y - TILE_HEIGHT, bean1.spriteIndex, Math.PI / 2, false))

                this.cameras.main.shake(500, 0.01);

                this.animateMatchTween(newMatches, newPowerups)

            }
            // both are bugs
            else if ((this.isBugSprite(bean1.spriteIndex) && this.isBugSprite(bean2.spriteIndex)) || (this.isBugSprite(bean2.spriteIndex) && this.isBugSprite(bean1.spriteIndex))) {
                let newPowerups = []
                let newMatches = []
                
                let pos1 = [bean1.x, bean1.y]
                let pos2 = [bean2.x, bean2.y]

                // first destroy the other bomb
                if (this.beans[pos2].spriteIndex in destroyedBeans) {
                    destroyedBeans[this.beans[pos2].spriteIndex]++
                }
                this.beans[pos2].destroy()
                delete this.beans[pos2]

                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    
                    if (pos[1] == bean1.y || pos[0] == bean1.x) {
                        //  identify powerUp but not the thing in the middle
                        if (this.beans[pos].spriteIndex >= 9 && String(pos) != String(pos1)) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }
                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        this.beans[pos].destroy()
                        delete this.beans[pos]
                    }
                }

                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y, bean1.spriteIndex, 0, true))
                newMatches = newMatches.concat(this.createTempBeatles(bean1.x, bean1.y, bean1.spriteIndex, Math.PI / 2, false))

                this.cameras.main.shake(500, 0.01);

                this.animateMatchTween(newMatches, newPowerups)

            }
            else if (this.canMatch()) {
                this.moveBeans() 
            }
            else {
                isMoved = false
                // there is nothing to match so reverse
                let bean1 = this.beans[[x1, y1]];
                let bean2 = this.beans[[x2, y2]];

                bean1.originX = x2;
                bean1.originY = y2;
                bean2.originX = x1;
                bean2.originY = y1;

                this.beans[[x1, y1]] = bean2;
                this.beans[[x2, y2]] = bean1;

                let reverseTween = this.tweens.add({
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
                
                reverseTween.on('complete', function () { this.candrag = true }, this);
            }

            if (isMoved) {
                this.moves--
                if (this.moves == 0){
                    this.gameOver = true
                }
                this.movesText.text = this.moves
            }

            this.updateScore(destroyedBeans)
            
        }, this);
    }

    isBugSprite(spriteIndex) {
        if (spriteIndex >= 10 && spriteIndex < 20) {return true}
        return false
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
            else if (this.canMatch()) {this.matchBeans()}
            else {
                if (this.gameOver) {
                    console.log("game over")
                }
                else {this.candrag = true}
            }
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
            spriteIndexByPos[key] = this.beans[key].matchIndex
        }

        // create temp beans that are only there to animate them in the tweens event
        let tempBombs = []
        for (const [key, arr] of Object.entries(bombs)) {
            arr.forEach(value => {
                let beanPos = this.getPosFromKey(value)
                let tempBomb = this.createBean(beanPos[0], beanPos[1], this.beans[beanPos].spriteIndex)
                tempBomb.rotation = this.beans[beanPos].rotation
                
                let targetPos = this.getPosFromKey(key)
                tempBomb.targetX = targetPos[0]
                tempBomb.targetY = targetPos[1]

                tempBombs.push(tempBomb)
            })
        }

        // delete all the beans involved
        let destroyedBeans = {}
        for (let i=0; i < this.collect.numberOfCollectibles; i++) {
            destroyedBeans[this.collect[String(i)].spriteIndex] = 0
        }
        for (const [key, arr] of Object.entries(bombs)) {
            arr.forEach(value => {
                if (value in this.beans){
                    if (this.beans[value].spriteIndex in destroyedBeans) {
                        destroyedBeans[this.beans[value].spriteIndex]++
                    }
                    this.beans[value].destroy()
                    delete this.beans[value]
                }
            })
        }
        this.updateScore(destroyedBeans)

        // create the new bombs
        for (const key of Object.keys(bombs)) {
            let pos = this.getPosFromKey(key)
            this.beans[pos] = this.createBean(pos[0], pos[1], spriteIndexByPos[key] + 20)
        }
        return tempBombs
    }

    getSpriteIndexByPos(match) {
        let spriteIndexByPos = {}
        match.forEach(value => {
            let pos = value[Math.floor(value.length / 2)]
            spriteIndexByPos[pos] = this.beans[pos].matchIndex
        })
        return spriteIndexByPos
    }

    createTempBeans(match) {
        let tempBeans = []
        match.forEach(arr => {
            let targetPos = this.getPosFromKey(arr[Math.floor(arr.length / 2)])
            
            arr.forEach(value => {
                let beanPos = this.getPosFromKey(value)
                let temp = this.createBean(beanPos[0], beanPos[1], this.beans[beanPos].spriteIndex)
                temp.rotation = this.beans[beanPos].rotation

                temp.targetX = targetPos[0]
                temp.targetY = targetPos[1]

                tempBeans.push(temp)
            })
        })
        return tempBeans
    }

    deleteAllBeans(match) {
        let destroyedBeans = {}
        for (let i=0; i < this.collect.numberOfCollectibles; i++) {
            destroyedBeans[this.collect[String(i)].spriteIndex] = 0
        }

        match.forEach(arr => {
            arr.forEach(value => {
                if (value in this.beans){
                    if (this.beans[value].spriteIndex in destroyedBeans) {
                        destroyedBeans[this.beans[value].spriteIndex]++
                    }

                    this.beans[value].destroy()
                    delete this.beans[value]
                }
            })
        })
        this.updateScore(destroyedBeans)
    }

    updateScore(destroyedBeans) {
        for (const [key, value] of Object.entries(destroyedBeans)) {
            for (let i=0; i < this.collect.numberOfCollectibles; i++) {
                if (this.collect[String(i)].spriteIndex == key && value > 0) {
                    this.collect[String(i)].collected += value
                    this.collect[String(i)].txt.text = this.collect[String(i)].collected

                    let collect = this.collect[String(i)]

                    let bean = this.physics.add.sprite(collect.bean.x, collect.bean.y, 'match3Sprite', collect.spriteIndex).setOrigin(0.5)
                    let txt = this.add.text(collect.bean.x + 80, collect.bean.y, "+" + value, { color: "#ffffff", fontSize: "40px", stroke: "#63666a", strokeThickness: 8}).setOrigin(0.5)
                    let tween = this.tweens.add({
                        targets: [bean, txt],
                        ease: 'Power',
                        duration: 300,
                        alpha: 0.5,
                        y: bean.y - 80,
                        repeat: 0,
                        yoyo: false
                    }, this);

                    tween.on('complete', function () { 
                        bean.destroy()
                        txt.destroy()
                    })

                    break
                }
            }
        }
    }

    match5OrHigher(horizontals, verticals) {
        // get every match 5 or higher
        let match = []
        horizontals.concat(verticals).forEach(value => {
            if (value.length >= 5) {
                match.push(value)
            }
        })

        // get the spriteindex of the bean that becomes a match 5
        let spriteIndexByPos = this.getSpriteIndexByPos(match)

        // create temp beans that are only there to animate them in the tweens event
        let tempMatch5 = this.createTempBeans(match)

        // delete all the beans involved
        this.deleteAllBeans(match)

        // create the new match 5
        for (const key of Object.keys(spriteIndexByPos)) {
            let pos = this.getPosFromKey(key)
            this.beans[pos] = this.createBean(pos[0], pos[1], 9)
        }

        return tempMatch5
    }

    match4(matches, spriteRotation) {
        // get every match 5 or higher
        let match = []
        matches.forEach(value => {
            if (value.length == 4) {
                match.push(value)
            }
        })

        // get the spriteindex of the bean that becomes a match 5
        let spriteIndexByPos = this.getSpriteIndexByPos(match)

        // create temp beans that are only there to animate them in the tweens event
        let tempMatch4 = this.createTempBeans(match)

        // delete all the beans involved
        this.deleteAllBeans(match)

        // create the new match 4
        for (const [key, value] of Object.entries(spriteIndexByPos)) {
            let pos = this.getPosFromKey(key)
            this.beans[pos] = this.createBean(pos[0], pos[1], value + 10)
            this.beans[pos].setRotation(spriteRotation)
        }

        return tempMatch4
    }

    match3(horizontals, verticals) {
        // get every match 5 or higher
        let match = []
        horizontals.concat(verticals).forEach(value => {
            if (value.length == 3) {
                match.push(value)
            }
        })

        // create temp beans that are only there to animate them in the tweens event
        let tempMatch3 = this.createTempBeans(match)

        // delete all the beans involved
        this.deleteAllBeans(match)

        return tempMatch3
    }

    createTempBeatles(x, y, spriteIndex, rotation, isVertical=true) {
        let beatle1 = this.createBean(x, y, spriteIndex)
        beatle1.setRotation(rotation)
        
        if (isVertical) {
            beatle1.targetX = x
            beatle1.targetY = 0
        }
        else {
            beatle1.targetX = CANVAS_WIDTH
            beatle1.targetY = y
        }

        let beatle2 = this.createBean(x, y, spriteIndex)
        beatle2.setRotation(rotation)
        beatle2.rotation += Math.PI
        
        if (isVertical) {
            beatle2.targetX = x
            beatle2.targetY = CANVAS_WIDTH
        }
        else {
            beatle2.targetX = 0
            beatle2.targetY = y
        }
        

        return [beatle1, beatle2]
    }

    createTempBeanFromPos(pos) {
        let powerUp = this.createBean(pos[0], pos[1], this.beans[pos].spriteIndex)
        powerUp.setRotation(this.beans[pos].rotation)
        powerUp.targetX = pos[0]
        powerUp.targetY = pos[1]
        return powerUp
    }

    animateMatch(match) {
        // handle power ups
        let newPowerups = []

        let newMatches = []

        let destroyedBeans = {}
        for (let i=0; i < this.collect.numberOfCollectibles; i++) {
            destroyedBeans[this.collect[String(i)].spriteIndex] = 0
        }

        match.forEach(bean => {
            if (bean.spriteIndex == 9) {
                // SuperPowerUp
                let randomMatchIndex = this.getRandomInt(0, this.numberOfBeans - 1);

                // get all beans that match this match index
                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    if (this.beans[pos].matchIndex == randomMatchIndex) {
                        //  identify powerUp
                        if (this.beans[pos].spriteIndex >= 9) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }
                        
                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        this.beans[pos].destroy()
                        delete this.beans[pos]

                    }
                }

                // create super powerUp
                let spu = this.createBean(bean.x, bean.y, bean.spriteIndex)
                spu.targetX = bean.x
                spu.targetY = bean.y
                newMatches.push(spu)

                bean.destroy()

            }

            else if (bean.spriteIndex >= 20) {
                // BombPowerUp
                const directions = [-1, 0, 1]

                directions.forEach(x => {
                    directions.forEach(y => {
                        if (x != 0 || y != 0) {
                            let pos = [bean.x + (x * TILE_WIDTH), bean.y + (y * TILE_HEIGHT)]
                            if (pos in this.beans) {
                                //  identify powerUp
                                if (this.beans[pos].spriteIndex >= 9) {
                                    newPowerups.push(this.createTempBeanFromPos(pos))
                                }
                                
                                if (this.beans[pos].spriteIndex in destroyedBeans) {
                                    destroyedBeans[this.beans[pos].spriteIndex]++
                                }
                                this.beans[pos].destroy()
                                delete this.beans[pos]
                            }
                        }
                    })
                })

                // create temp bomb
                let bomb = this.createBean(bean.x, bean.y, bean.spriteIndex)
                bomb.targetX = bean.x
                bomb.targetY = bean.y
                newMatches.push(bomb)

                bean.destroy()
            }
            
            else if (this.isBugSprite(bean.spriteIndex) && bean.rotation == 0) {
                // BeatleVerticalPowerUp
                // get all beans that are on this vertical line and destroy them
                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    if (pos[0] == bean.x) {
                        //  identify powerUp
                        if (this.beans[pos].spriteIndex >= 9) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }
                        
                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        this.beans[pos].destroy()
                        delete this.beans[pos]

                    }
                }

                // create two beatles
                let beatles = this.createTempBeatles(bean.x, bean.y, bean.spriteIndex, bean.rotation, true)
                newMatches = newMatches.concat(beatles)

                bean.destroy()
            }

            else if (this.isBugSprite(bean.spriteIndex)) {
                // BeatleHorizontalPowerUp
                // get all beans that are on this horizontal line and destroy them
                for (const key of Object.keys(this.beans)) {
                    let pos = this.getPosFromKey(key)
                    
                    if (pos[1] == bean.y) {
                        //  identify powerUp
                        if (this.beans[pos].spriteIndex >= 9) {
                            newPowerups.push(this.createTempBeanFromPos(pos))
                        }

                        if (this.beans[pos].spriteIndex in destroyedBeans) {
                            destroyedBeans[this.beans[pos].spriteIndex]++
                        }
                        this.beans[pos].destroy()
                        delete this.beans[pos]
                    }
                }

                // create two beatles
                let beatles = this.createTempBeatles(bean.x, bean.y, bean.spriteIndex, bean.rotation, false)
                newMatches = newMatches.concat(beatles)

                bean.destroy()
            }
        });

        this.updateScore(destroyedBeans)
        match = match.concat(newMatches)
        this.animateMatchTween(match, newPowerups)
    }

    animateMatchTween(match, newPowerups){
        // make all the powerups beat so you can see, that they are next
        let powerUpTween = this.tweens.add({
            targets: newPowerups,
            ease: 'Power',
            duration: this.animationTime / 3,
            scale: 1.3,
            repeat: -1,
            yoyo: true
        }, this);


        let tween = this.tweens.add({
            targets: match,
            ease: 'Power',
            duration: this.animationTime,
            x: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                if (target.spriteIndex >= 10 && target.spriteIndex < 20) {return target.targetX}
                return target.x;
            },
            y: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                if (target.spriteIndex >= 10 && target.spriteIndex < 20) {return target.targetY}
                return target.y;
            },
            scale: function(target, targetKey, value, targetIndex, totalTargets, tween) {
                if (target.spriteIndex >= 20) {return 4}
                else if (target.spriteIndex < 9) { return 0}
                return 1;
            },
            repeat: 0,
            yoyo: false
        }, this);

        tween.on('complete', function (obj) { 
            powerUpTween.remove()
            let somethingMatched = false;
            tween.targets.forEach(value => {
                value.destroy()
                somethingMatched = true
            })
            if (newPowerups.length > 0) {
                this.animateMatch(newPowerups)
            }
            else if (!somethingMatched) {
                if (this.gameOver) {
                    console.log("game over")
                }
                else {this.candrag = true}
            }
            else {this.matchBeans()}
            
        }, this);
    }

    canMatch() {
        let [matchedVerticalBeans, horizontals] = this.getHorizontalMatches();
        let [matchedHorizontalBeans, verticals, crosses] = this.getVerticalMatches(matchedVerticalBeans)

        if (verticals.length > 0 || horizontals.length > 0) {
            return true
        }
        return false
    }

    // match calls itself as long there is something to match - after that it calls the move method
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

        // PRIO 3 Match 4
        let match4Hor = this.match4(horizontals, Math.PI / 2)
        let match4Ver = this.match4(verticals, 0)
        let match4 = match4Ver.concat(match4Hor)
        if (match4.length > 0) {
            this.animateMatch(match4)
            return true
        }


        // PRIO 4 Match 3
        let match3 = this.match3(horizontals, verticals)
        if (match3.length > 0) {
            this.animateMatch(match3)
            return true
        }

        this.moveBeans()
        return false
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
                if (this.dictGet(this.beans, nextHorPos, null).matchIndex != value.matchIndex) {
                    break;
                }
                tempPos.push(String(nextHorPos));
                i++;
            }

            // must be beans and at least 3 together
            if (i >= 3 && value.matchIndex < 9) {
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
                if (this.dictGet(this.beans, nextVerPos, null).matchIndex != value.matchIndex) {
                    break;
                }

                if (horizontalMatches.has(String(nextVerPos))) {
                    isCrossed = true;
                }

                tempPos.push(String(nextVerPos));
                i++;
            }

            // must be beans and at least 3 together
            if (i >= 3 && value.matchIndex < 9) {
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

