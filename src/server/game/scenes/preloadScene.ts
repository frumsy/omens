
export default class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: 'PreloadScene' })
    }
  
    preload() {
      console.log("\n\nPRELOAD \n\n")
    //this.load.setBaseURL('static/client')
      this.load.image('road_4', '../../../../dist/client/assets/road_4.png')
      this.load.tilemapTiledJSON('level1', '../../../../dist/client/assets/maps/tileMap.json')
      console.log("\n\nPRELOAD2 \n\n")
    }
    create() {
      console.log("PRELOAD-create \n\n")
      this.scene.start('MainScene')
    }
}      