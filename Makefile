#figwheel without the XCode IDE


# first run fig in one terminal:

fig:
	rlwrap lein figwheel


# packager in another terminal:

packager:
	npm start


# then launch in a third terminal:

launch: build-js bundle build-and-run-on-sim

build-js:
	lein cljsbuild once dev

bundle:
	react-native bundle --entry-file development.ios.js --platform ios --bundle-output ios/main.jsbundle

build-and-run-on-sim:
	xcodebuild \
	-project ios/figTest.xcodeproj \
	-scheme figTest \
	-destination platform='iOS Simulator',OS=9.1,id=1C1601B6-986A-4CB6-ADBF-988E6DE7A65B \
	test

