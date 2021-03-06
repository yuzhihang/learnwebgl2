/**
 * blender_orientation_render.js, By Wayne Brown, Fall 2017
 */

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 C. Wayne Brown
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

/** -----------------------------------------------------------------------
 * Create a WebGL 3D scene, store its state, and render its models.
 *
 * @param id {string} The id of the webglinteractive directive
 * @param download {object} An instance of the SceneDownload class
 * @param vshaders_dictionary {dict} A dictionary of vertex shaders.
 * @param fshaders_dictionary {dict} A dictionary of fragment shaders.
 * @param models {dict} A dictionary of models.
 * @constructor
 */
window.BlenderOrientationScene = function (id, download, vshaders_dictionary,
                                fshaders_dictionary, models) {

  // Private variables
  let self = this; // Store a local reference to the new object.

  let canvas_id = download.canvas_id;
  let out = download.out;
  let events;

  let gl = null;
  let program = null;
  let model_VOBs = [];
  let model_gpu;

  let matrix = new GlMatrix4x4();
  let transform = matrix.create();
  let rotate_x_matrix = matrix.create();
  let rotate_y_matrix = matrix.create();
  let projection = matrix.createOrthographic(-3.0,3.0,-3.0,3.0,-10.0,10.0);
  let camera_matrix = matrix.create();

  // Public variables that will be changed by event handlers.
  self.canvas = null;
  self.angle_x = 0.0;
  self.angle_y = 0.0;
  self.animate_active = false;

  //-----------------------------------------------------------------------
  // Public function to render the scene.
  self.render = function () {

    // Build individual transforms
    matrix.setIdentity(transform);
    matrix.rotate(rotate_x_matrix, self.angle_x, 1, 0, 0);
    matrix.rotate(rotate_y_matrix, self.angle_y, 0, 1, 0);

    // Combine the transforms into a single transformation
    matrix.multiplySeries(transform, projection, camera_matrix, rotate_x_matrix, rotate_y_matrix);

    // Draw each model
    for (let j = 0; j < model_VOBs.length; j += 1) {
      model_VOBs[j].render(transform);
    }
  };

  //-----------------------------------------------------------------------
  // Public function to delete and reclaim all rendering objects.
  self.delete = function () {

    // Clean up shader programs
    gl.deleteShader(program.vShader);
    gl.deleteShader(program.fShader);
    gl.deleteProgram(program);
    program = null;

    // Delete each model's VOB
    for (let j = 0; j < model_VOBs.length; j += 1) {
      model_VOBs[j].delete(gl);
    }
    model_VOBs = [];

    // Remove all event handlers
    events.removeAllEventHandlers();
    events = null;

    // Disable any animation
    self.animate_active = false;

    gl = null;
  };

  //-----------------------------------------------------------------------
  // Object constructor. One-time initialization of the scene.

  // Get the rendering context for the canvas
  self.canvas = download.getCanvas(id + "_canvas");
  if (self.canvas) {
    gl = download.getWebglContext(self.canvas);
  }
  if (!gl) {
    return;
  }

  // Set up the rendering program and set the state of webgl
  program = download.createProgram(gl, vshaders_dictionary["color_per_vertex"], fshaders_dictionary["color_per_vertex"]);
  gl.useProgram(program);

  // Enable hidden-surface removal
  gl.enable(gl.DEPTH_TEST);

  matrix.lookAt(camera_matrix, 0, 0, 4, 0, 0, 0, 0, 1, 0);

  // Create Vertex Object Buffers for the models
  let n = models.number_models;
  model_VOBs = new Array(n);
  for (let j = 0; j < n; j += 1) {
    model_gpu = new ModelArraysGPU (gl, models[j], download.out);
    model_VOBs[j] = new RenderColorPerVertex(gl, program, model_gpu, download.out);
  }

  // Set up callbacks for user and timer events
  events = new BlenderOrientationEvents(id, self);
  events.animate();
};

