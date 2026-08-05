import React, { useState, useEffect } from 'react';
import { GolfCourse } from '../types';
import { SAMPLE_COURSES, generateCustomCourse } from '../data/courses';
import { Search, MapPin, Flag, Plus, Check, Compass, Loader2, RefreshCw, Radio } from 'lucide-react';

interface CourseSelectorProps {
  selectedCourse: GolfCourse;
  onSelectCourse: (course: GolfCourse) => void;
  onClose: () => void;
  userLat?: number;
  userLng?: number;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  selectedCourse,
  onSelectCourse,
  onClose,
  userLat,
  userLng,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCity, setCustomCity] = useState('');

  // API State
  const [apiCourses, setApiCourses] = useState<(GolfCourse & { distanceKm?: number; isLiveFetched?: boolean })[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const fetchNearbyApiCourses = async (lat: number, lng: number) => {
    setIsLoadingApi(true);
    try {
      const res = await fetch(`/api/courses/nearby?lat=${lat}&lng=${lng}`, {
        headers: {
          'Authorization': 'Bearer B5Z4DM2AMTA7HULMXDHF3DEZSI',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.courses && Array.isArray(data.courses)) {
          setApiCourses(data.courses);
        }
      }
    } catch (err) {
      console.error('Error reaching local course API:', err);
    } finally {
      setIsLoadingApi(false);
      setApiLoaded(true);
    }
  };

  useEffect(() => {
    if (userLat && userLng && !apiLoaded) {
      fetchNearbyApiCourses(userLat, userLng);
    }
  }, [userLat, userLng, apiLoaded]);

  const handleManualApiSearch = () => {
    const lat = userLat || 36.568;
    const lng = userLng || -121.947;
    fetchNearbyApiCourses(lat, lng);
  };

  const allCourses = [
    ...apiCourses,
    ...SAMPLE_COURSES.filter((sc) => !apiCourses.some((ac) => ac.name.toLowerCase() === sc.name.toLowerCase())),
  ];

  const filteredCourses = allCourses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAndClose = (course: GolfCourse) => {
    onSelectCourse(course);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const newCourse = generateCustomCourse(customName, customCity, userLat, userLng);
    onSelectCourse(newCourse);
    setShowCustomModal(false);
    onClose();
  };

  const handleNearestCourse = () => {
    if (apiCourses.length > 0) {
      handleSelectAndClose(apiCourses[0]);
    } else if (SAMPLE_COURSES.length > 0) {
      handleSelectAndClose(SAMPLE_COURSES[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
              <span>Select Golf Course</span>
              {apiCourses.length > 0 && (
                <span className="bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800 px-2 py-0.5 rounded-full font-mono flex items-center space-x-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  <span>API Connected</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-400">18-hole GPS green coordinates loaded</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-800"
          >
            Close
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-4 bg-stone-900/90 border-b border-stone-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by course name, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-950 text-stone-100 text-sm pl-9 pr-4 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-emerald-500 placeholder-stone-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleNearestCourse}
              className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nearest GPS Course</span>
            </button>

            <button
              onClick={handleManualApiSearch}
              disabled={isLoadingApi}
              title="Query Local Courses API via GPS"
              className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-emerald-400 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border border-stone-700 transition"
            >
              {isLoadingApi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>API Search</span>
            </button>

            <button
              onClick={() => setShowCustomModal(true)}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-stone-400" />
              <span>Custom</span>
            </button>
          </div>
        </div>

        {/* Course List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {isLoadingApi && (
            <div className="flex items-center justify-center p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-xl space-x-2 text-xs text-emerald-300">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Querying local golf course database API...</span>
            </div>
          )}

          {filteredCourses.length === 0 && !isLoadingApi ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              No courses matching "{searchTerm}". You can create a custom course above.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const isSelected = selectedCourse.id === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => handleSelectAndClose(course)}
                  className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-start justify-between ${
                    isSelected
                      ? 'bg-emerald-950 border-emerald-500 text-white shadow-md'
                      : 'bg-stone-950/70 border-stone-800/80 hover:bg-stone-800/60 text-stone-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white flex items-center space-x-2">
                      <span>{course.name}</span>
                      {isSelected && (
                        <span className="bg-emerald-500 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                      {course.isLiveFetched && (
                        <span className="bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono px-1.5 py-0.5 rounded">
                          Live API
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-stone-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        <span>{course.location}</span>
                      </span>
                      {course.distanceKm !== undefined && (
                        <span className="text-emerald-400 font-mono text-[11px]">
                          ({course.distanceKm} km away)
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Flag className="w-3 h-3 text-emerald-500" />
                        <span>Par {course.parTotal} ({course.totalYards} yds)</span>
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 ml-2 mt-1" />}
                </button>
              );
            })
          )}
        </div>

        {/* Custom Course Form Modal */}
        {showCustomModal && (
          <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Create Unlisted Golf Course
            </h4>
            <form onSubmit={handleCreateCustom} className="space-y-3">
              <input
                type="text"
                placeholder="Course Name (e.g. Oakridge Country Club)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="w-full bg-stone-900 border border-stone-800 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="City, State (e.g. Houston, TX)"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
