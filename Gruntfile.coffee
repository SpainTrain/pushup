'use strict'
path = require 'path'
lrsnippet = require('grunt-contrib-livereload/lib/utils').livereloadSnippet

folderMount = (connect, point) ->
  connect.static path.resolve(point)

module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    
    clean:
      production: ['_prod_public']

    coffeelint:
      app: ['app/**/*.coffee']
      # tests: 
      #   files:
      #     src: ['test/*.coffee']
      options:
        no_trailing_whitespaces:
          level: 'error'
    
    coffee:
      development:
        files:
          '_dev_public/js/app-<%= pkg.version %>.js': ['app/**/*.coffee']
          #'test/<%= pkg.name %>-tests.js': ['test/*Spec.coffee']
      # glob_to_multiple:
      #   expand: true
      #   cwd: 'app/'
      #   src: ['*.coffee']
      #   dest: '_dev_public/js/'
      #   ext: '.js'
      production:
        files:
          '_prod_public/js/app.js': ['app/**/*.coffee']
    
    concat:
      app:
        dest: '_dev_public/js/app-<%= pkg.version %>.js'
        src: [
          'app/scripts/pushup.js'
        ]
      vendor: #TODO: replace with include (from json, yaml, or `bower list`)
        dest: '_dev_public/js/vendor-<%= pkg.version %>.js'
        src: []

    less:
      development:
        options:
          paths: ['app/styles', 'components']
        files: 
          '_dev_public/css/app-<%= pkg.version %>.css': 'app/styles/pushup.less'
      production:
        options:
          paths: ['app/styles', 'components']
        files: 
          '_prod_public/css/app.css': 'app/styles/app.less'

    jade:
      development:
        options:
          pretty: true
        files: [
          expand: true
          cwd: 'app/'
          src: ['**/*.jade']
          dest: '_dev_public/'
          ext: '.html'
        ]
      production:
        files: [
          expand: true
          cwd: 'app/'
          src: ['**/*.jade']
          dest: '_prod_public/'
          ext: '.html'
        ]

    copy:
      development:
        files: [ 
          { expand: yes, cwd: 'app/', src: ['**/*.html'], dest: '_dev_public/' }
          { expand: yes, cwd: 'app/font/', src: ['**'], dest: '_dev_public/font/' }
          { expand: yes, cwd: 'app/images/', src: ['**'], dest: '_dev_public/images/' }
        ]
      production:
        files: [
          { expand: yes, cwd: 'app/font/', src: ['**'], dest: '_prod_public/font/' }
        ]

    imagemin:
      production:
        options:
          optimizationLevel: 7
        files: [
          { expand: yes, cwd: 'app/images/', src: ['**'], dest: '_prod_public/images/' }
        ]

    uglify:
      options:
        mangle:
          except: ['jQuery', 'angular', 'URI']
      production:
        files:
          '_prod_public/js/app-<%= pkg.version %>.js': ['_prod_public/js/app.js']
          '_prod_public/js/vendor-<%= pkg.version %>.js': [
            'components/jquery/jquery.js'
            'components/angular/angular.js'
            'components/angular-resource/angular-resource.js'
            'components/angular-cookies/angular-cookies.js'
            'components/angular-piwik/angular-piwik.js'
            'components/jquery-file-upload/js/vendor/jquery.ui.widget.js'
            'components/jquery-file-upload/js/jquery.iframe-transport.js'
            'components/jquery-file-upload/js/jquery.fileupload.js'
            'components/angular-personal/dist/angular-personal-complete.js'
            #'../../angular-personal/dist/angular-personal-complete.js'
            'components/uri.js/src/URI.js'
            'components/bootstrap/js/bootstrap-tooltip.js'
            'components/bootstrap/js/bootstrap-popover.js'
          ]

    cssmin:
      production:
        files:
          '_prod_public/css/app-<%= pkg.version %>.css': ['_prod_public/css/app.css']

    replace:
      development:
        options:
          variables:
            'version': '<%= pkg.version %>'
        files: [
          {src: ['_dev_public/index.html'], dest: '_dev_public/index.html'}
        ]
      production:
        options:
          variables:
            'version': '<%= pkg.version %>'
        files: [
          {src: ['_prod_public/index.html'], dest: '_prod_public/index.html'}
        ]

    testacular:
      unit:
        options:
          configFile: 'testacular.conf.js'
          browsers: if process.env.TRAVIS then ['Firefox', 'PhantomJS'] else ['PhantomJS']
          autoWatch: yes
          keepalive: yes
          singleRun: yes
    
    testacularRun:
      unit:
        options:
          runnerPort: 9100

    connect:
      livereload:
        options:
          port: 3333
          hostname: '0.0.0.0'
          middleware: (connect, options) ->
            [lrsnippet, folderMount(connect, './_dev_public')]
      production:
        options:
          port: 3333
          hostname: '0.0.0.0'
          middleware: (connect, options) ->
            [folderMount(connect, './_prod_public')]

    regarde: #TODO: make this taks immune to errors in subtasks
      buildcss:
        files: ['app/**/*.less', 'app/**/*.sass', 'app/**/*.scss']
        tasks: ['less:development'] #TODO: add SASS, Compass, and copy css tasks
      buildother:
        files: ['app/**', '!app/**/*.less', '!app/**/*.sass', '!app/**/*.scss']
        tasks: ['lint', 'build:dev']
      js:
        files: '_dev_public/**/*.js'
        tasks: ['livereload']
      css:
        files: '_dev_public/**/*.css'
        tasks: ['livereload']
      html:
        files: '_dev_public/**/*.html'
        tasks: ['livereload']


  ### Vendor Tasks ###
  #Prep
  grunt.loadNpmTasks 'grunt-contrib-clean'

  # Linting
  grunt.loadNpmTasks 'grunt-coffeelint'
  #grunt.loadNpmTasks 'grunt-contrib-jshint'

  # Building
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-less'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  # Testing (Dev)
  grunt.loadNpmTasks 'grunt-testacular'
  
  # Optimization (Prod)
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-cssmin'
  grunt.loadNpmTasks 'grunt-contrib-htmlmin'
  grunt.loadNpmTasks 'grunt-contrib-imagemin'
  #grunt.loadNpmTasks 'grunt-contrib-compress'

  #cache bust
  grunt.loadNpmTasks 'grunt-replace'

  # Static Server (Dev)
  grunt.loadNpmTasks 'grunt-contrib-connect'

  # LiveReload (Dev)
  grunt.loadNpmTasks 'grunt-regarde'
  grunt.loadNpmTasks 'grunt-contrib-livereload'

  
  ### CUSTOM TASKS ###
  grunt.registerTask 'lint', ['coffeelint']
  grunt.registerTask 'build:dev', ['lint', 'coffee:development', 'concat', 'less:development', 'jade:development', 'copy:development', 'replace:development']
  grunt.registerTask 'build:prod', ['lint', 'clean:production', 'coffee:production', 'less:production', 'jade:production', 'copy:production', 'imagemin:production', 'uglify:production', 'cssmin:production', 'replace:production'] #TODO: minhtml and cache-bust
  #TODO: grunt.registerTask 'test', []
  grunt.registerTask 'default', ['build:dev', 'livereload-start', 'connect:livereload', 'regarde']
  grunt.registerTask 'prodweb', ['connect:production', 'regarde']

  # TODO: Task (possibly custom) to add cache busting sigs to files