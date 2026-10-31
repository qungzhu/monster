# Adds the iOS lock-screen pieces to ios/App/App.xcodeproj:
#  - the Live Photo plugin sources (App/PetLockScreen) to the App target,
#  - the PetWidget WidgetKit extension, embedded in the app,
#  - the shared App Group store (Shared/PetWidgetStore.swift) to both,
#  - entitlements (App Group group.com.furrypal.app) for both.
#
#   gem install xcodeproj && ruby scripts/ios-add-lock-screen.rb
#
# Safe to run again: anything already there is left alone.
require 'xcodeproj'

root = File.expand_path('..', __dir__)
project_path = File.join(root, 'ios/App/App.xcodeproj')
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' } or abort 'App target missing'
app_group = project.main_group['App']
# Lock-screen widgets need iOS 16; cap sync then asks the same of the
# Capacitor package, so the whole app targets 16.
project.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0' }
app.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0' }

def add_file(group, path, targets)
  ref = group.files.find { |f| f.path == path } || group.new_reference(path)
  targets.each do |t|
    t.source_build_phase.add_file_reference(ref, true) unless t.source_build_phase.files_references.include?(ref)
  end
  ref
end

# App: plugin sources + entitlements.
plugin_group = app_group['PetLockScreen'] || app_group.new_group('PetLockScreen', 'PetLockScreen')
%w[FurryPalViewController.swift PetLockScreenPlugin.swift LivePhotoWriter.swift].each do |f|
  add_file(plugin_group, f, [app])
end
app_group.files.find { |f| f.path == 'App.entitlements' } || app_group.new_reference('App.entitlements')
app.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end

# Widget extension.
widget = project.targets.find { |t| t.name == 'PetWidget' }
unless widget
  widget = project.new_target(:app_extension, 'PetWidget', :ios, '16.0', project.products_group, :swift)
  widget.build_configurations.each do |c|
    s = c.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.furrypal.app.PetWidget'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = 'PetWidget/Info.plist'
    s['CODE_SIGN_ENTITLEMENTS'] = 'PetWidget/PetWidget.entitlements'
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['MARKETING_VERSION'] = '1.0'
    s['CURRENT_PROJECT_VERSION'] = '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = ''
  end
end
widget_group = project.main_group['PetWidget'] || project.main_group.new_group('PetWidget', 'PetWidget')
add_file(widget_group, 'PetWidget.swift', [widget])
%w[Info.plist PetWidget.entitlements].each do |f|
  widget_group.files.find { |r| r.path == f } || widget_group.new_reference(f)
end
# Swift imports link WidgetKit / SwiftUI by themselves; drop the
# SDK-versioned Foundation.framework reference new_target adds.
widget.frameworks_build_phase.files.dup.each do |bf|
  ref = bf.file_ref
  bf.remove_from_project
  ref&.remove_from_project
end
fw_group = project.frameworks_group
fw_group.recursive_children.select { |g| g.is_a?(Xcodeproj::Project::Object::PBXGroup) && g.children.empty? }.each(&:remove_from_project)
fw_group.remove_from_project if fw_group.children.empty?

# Shared store, compiled into both.
shared_group = project.main_group['Shared'] || project.main_group.new_group('Shared', 'Shared')
add_file(shared_group, 'PetWidgetStore.swift', [app, widget])

# Build the widget with the app and embed it in App.app/PlugIns.
app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
end
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

project.save

# Shared "App" scheme, so command-line builds (CI) find it without Xcode
# having opened the project first.
scheme_path = Xcodeproj::XCScheme.shared_data_dir(project_path) + 'App.xcscheme'
unless File.exist?(scheme_path)
  scheme = Xcodeproj::XCScheme.new
  scheme.add_build_target(app)
  scheme.set_launch_target(app)
  scheme.save_as(project_path, 'App', true)
end
puts "ok: #{project.targets.map(&:name).join(', ')}"
