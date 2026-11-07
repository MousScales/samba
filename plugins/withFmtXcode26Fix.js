const { withPodfile, createRunOncePlugin } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'fmt-xcode26-fix';

const FMT_FIX_RUBY = `
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
  end

  fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
  if File.exist?(fmt_base)
    content = File.read(fmt_base)
    patched = content.gsub(/#\\s*define FMT_USE_CONSTEVAL 1/, '# define FMT_USE_CONSTEVAL 0')
    File.write(fmt_base, patched) if patched != content
  end
`.trim();

function withFmtXcode26Fix(config) {
  return withPodfile(config, (config) => {
    const result = mergeContents({
      tag: TAG,
      src: config.modResults.contents,
      newSrc: FMT_FIX_RUBY,
      anchor: /react_native_post_install\(/,
      offset: 6,
      comment: '#',
    });

    if (result.didMerge || result.didClear) {
      config.modResults.contents = result.contents;
    }

    return config;
  });
}

module.exports = createRunOncePlugin(withFmtXcode26Fix, 'with-fmt-xcode26-fix', '1.0.0');
